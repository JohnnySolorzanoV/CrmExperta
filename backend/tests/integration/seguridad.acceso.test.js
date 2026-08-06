import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api seguridad: autenticacion y pertenencia', () => {
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

  it('SEC-01 GET /api/chatbot/historial/:idUsu devuelve 403 si se pide el historial de otro usuario', async () => {
    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(r.status).toBe(403)
  })

  it('SEC-02 GET /api/casos/cliente/:id devuelve 403 si un cliente pide los casos de otro usuario', async () => {
    var r = await request(APP)
      .get('/api/casos/cliente/' + ids.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(r.status).toBe(403)
  })

  it('SEC-03 GET /api/citas/cliente/:id devuelve 403 si un cliente pide las citas de otro usuario', async () => {
    var r = await request(APP)
      .get('/api/citas/cliente/' + ids.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(r.status).toBe(403)
  })

  it('SEC-04 el administrador no accede a los modulos operativos (citas, chatbot, calendario)', async () => {
    var rChat = await request(APP)
      .get('/api/chatbot/historial/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(rChat.status).toBe(403)

    var rCitas = await request(APP)
      .get('/api/citas/cliente/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(rCitas.status).toBe(403)

    var rCalendario = await request(APP)
      .get('/api/calendario/abogado/' + ids.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(rCalendario.status).toBe(403)
  })

  it('SEC-05 el dueño de un caso puede consultarlo y otro usuario ajeno obtiene 403', async () => {
    var nuevoCaso = await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['abierto', 'civil', 'Caso Seguimiento Seguridad', ids.clientePkId, ids.abogadoPkId]
    )
    var casoId = nuevoCaso.rows[0].id

    var dueno = await request(APP)
      .get('/api/casos/' + casoId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(dueno.status).toBe(200)

    // ida de otro usuario que no es dueño del caso
    var otroCliente = await queryTest(
      `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['0200000099', 'Cliente Ajeno', 'ajeno@test.com', 'hash-no-usado']
    )
    await queryTest(
      `INSERT INTO Cliente (id_usuario, direccion, telefono) VALUES ($1, $2, $3)`,
      [otroCliente.rows[0].id, 'Direc ajeno', '0990000099']
    )
    var tokenAjeno = crearTokenTest({ id: otroCliente.rows[0].id, correo: 'ajeno@test.com', roles: ['cliente'] })

    var ajeno = await request(APP)
      .get('/api/casos/' + casoId)
      .set('Authorization', 'Bearer ' + tokenAjeno)
    expect(ajeno.status).toBe(403)
  })
})