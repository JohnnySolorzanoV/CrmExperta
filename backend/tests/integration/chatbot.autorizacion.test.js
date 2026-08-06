import request from 'supertest'
import bcrypt from 'bcrypt'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import {
  verificarBasePruebasDisponible,
  queryTest,
  resetearBasePruebas,
  sembrarUsuariosBase,
} from '../helpers/dbTestUtils.js'

async function sembrarHistorial(idUsuario) {
  await queryTest(
    `INSERT INTO Chatbot (id_usuario, chat_log) VALUES ($1, $2)`,
    [idUsuario, JSON.stringify({ pregunta: 'Hola', respuesta: 'Hola, ¿en qué puedo ayudarte?' })]
  )
}

async function crearAbogadoAjeno() {
  var hash = await bcrypt.hash('Clave123*', 10)
  var u = await queryTest(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['0201000099', 'Abogado Ajeno', 'abogadoajeno@test.com', hash]
  )
  await queryTest(
    `INSERT INTO Abogado (id_usuario, num_licencia, especialidad) VALUES ($1, $2, $3)`,
    [u.rows[0].id, 'MAT-TEST-999', 'Penal']
  )
  return u.rows[0].id
}

async function contarFallidos() {
  var r = await queryTest(
    "SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE resultado = 'fallido'"
  )
  return r.rows[0].n
}

describe('Integracion autorizacion del chatbot', () => {
  var ids
  var tokenCliente
  var tokenAbogado
  var tokenAdmin

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenCliente = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
    tokenAbogado = crearTokenTest({ id: ids.abogadoUsuarioId, correo: 'abogado@test.com', roles: ['abogado'] })
    tokenAdmin = crearTokenTest({ id: ids.adminUsuarioId, correo: 'admin@test.com', roles: ['administrador'] })
  })

  it('CHA-01 el cliente consulta su propio historial', async () => {
    await sembrarHistorial(ids.clienteUsuarioId)
    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(r.status).toBe(200)
    expect(r.body.historial).toBeInstanceOf(Array)
    expect(r.body.historial.length).toBe(1)
  })

  it('CHA-02 un cliente NO puede consultar el historial de otra persona cambiando idUsuario', async () => {
    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(r.status).toBe(403)
  })

  it('CHA-03 el abogado asignado (con caso) consulta el historial de su cliente', async () => {
    await sembrarHistorial(ids.clienteUsuarioId)
    await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5)`,
      ['abierto', 'civil', 'Caso chatbot asignado', ids.clientePkId, ids.abogadoPkId]
    )

    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(r.status).toBe(200)
  })

  it('CHA-04 el abogado ajeno (sin caso asignado) recibe 403', async () => {
    var abogadoAjenoId = await crearAbogadoAjeno()
    var tokenAjeno = crearTokenTest({ id: abogadoAjenoId, correo: 'abogadoajeno@test.com', roles: ['abogado'] })

    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAjeno)
    expect(r.status).toBe(403)
  })

  it('CHA-05 el administrador no accede al historial (recurso operativo)', async () => {
    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(r.status).toBe(403)
  })

  it('CHA-06 los accesos indebidos reciben 403 y quedan auditados', async () => {
    await request(APP)
      .get('/api/chatbot/historial/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAdmin)

    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(r.status).toBe(403)

    expect(await contarFallidos()).toBeGreaterThanOrEqual(2)
  })
})