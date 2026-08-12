import request from 'supertest'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import {
  verificarBasePruebasDisponible,
  queryTest,
  resetearBasePruebas,
  sembrarUsuariosBase,
  proximaFranjaLaborable,
} from '../helpers/dbTestUtils.js'

var SECRET = process.env.JWT_SECRET || 'crm-experta-secreto-temporal'

// Simula una falla del INSERT de auditoría (p. ej. caída de la tabla) para
// comprobar que la operación sensible se revierte junto con su registro.
async function simularFallaAuditoria() {
  await queryTest('DROP TABLE IF EXISTS auditoria_logs')
}

async function contarFallidos(where, params = []) {
  var r = await queryTest(
    `SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE resultado = 'fallido' AND ${where}`,
    params
  )
  return r.rows[0].n
}

async function contarCitas() {
  var r = await queryTest('SELECT COUNT(*)::int AS n FROM Cita')
  return r.rows[0].n
}

async function contarHorarios() {
  var r = await queryTest('SELECT COUNT(*)::int AS n FROM Calendario')
  return r.rows[0].n
}

function guardarTokenRecuperacion(idUsuario, tokenPlano) {
  var tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex')
  return queryTest(
    `UPDATE Usuario
     SET reset_token_hash = $1, reset_token_expira = NOW() + INTERVAL '1 hour'
     WHERE id = $2`,
    [tokenHash, idUsuario]
  )
}

describe('Integracion atomicidad de auditoria', () => {
  var ids
  var tokenCliente
  var tokenAbogado

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenCliente = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
    tokenAbogado = crearTokenTest({ id: ids.abogadoUsuarioId, correo: 'abogado@test.com', roles: ['abogado'] })
  })

  it('AUD-AT-01 si el INSERT de auditoria falla, la cita se revierte (sin cita ni horario parcial)', async () => {
    await simularFallaAuditoria()

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: ids.clienteUsuarioId,
        idAbogado: ids.abogadoUsuarioId,
        fechaHoraCopia: proximaFranjaLaborable(),
        motivo: 'Atomicidad',
      })

    expect(r.status).toBe(500)
    expect(await contarCitas()).toBe(0)
    expect(await contarHorarios()).toBe(0)
  })

  it('AUD-AT-02 el login fallido queda registrado con resultado fallido', async () => {
    var r = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'abogado@test.com', contrasena: 'clave-incorrecta' })

    expect(r.status).toBe(401)
    expect(await contarFallidos("accion = 'LOGIN'")).toBeGreaterThanOrEqual(1)
  })

  it('AUD-AT-03 un conflicto de horario (409) queda auditado como fallido', async () => {
    var fecha = proximaFranjaLaborable()
    var ok = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: ids.clienteUsuarioId,
        idAbogado: ids.abogadoUsuarioId,
        fechaHoraCopia: fecha,
        motivo: 'Primera reserva',
      })
    expect(ok.status).toBe(201)

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: ids.clienteUsuarioId,
        idAbogado: ids.abogadoUsuarioId,
        fechaHoraCopia: fecha,
        motivo: 'Reserva duplicada',
      })

    expect(r.status).toBe(409)
    expect(await contarFallidos("detalle LIKE '%ya tiene una cita en esa hora%'")).toBeGreaterThanOrEqual(1)
  })

  it('AUD-AT-04 un 403 por permisos queda auditado como fallido', async () => {
    var r = await request(APP)
      .get('/api/casos/cliente/' + ids.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)

    expect(r.status).toBe(403)
    expect(await contarFallidos("recurso = 'Casos' AND detalle LIKE '%No tienes acceso a este recurso%'"))
      .toBeGreaterThanOrEqual(1)
  })

  it('AUD-AT-05 un token vencido queda auditado como fallido', async () => {
    var tokenVencido = jwt.sign(
      { id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] },
      SECRET,
      { expiresIn: '-1s' }
    )

    var r = await request(APP)
      .get('/api/citas/1')
      .set('Authorization', 'Bearer ' + tokenVencido)

    expect(r.status).toBe(401)
    expect(await contarFallidos("detalle LIKE '%Token invalido o expirado%'")).toBeGreaterThanOrEqual(1)
  })

  it('AUD-AT-06 el restablecimiento exitoso consume el token y deja auditoria', async () => {
    var tokenPlano = crypto.randomBytes(32).toString('hex')
    await guardarTokenRecuperacion(ids.clienteUsuarioId, tokenPlano)

    var r = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: tokenPlano, nuevaContrasena: 'NuevaClave99*' })

    expect(r.status).toBe(200)

    var fila = await queryTest(
      'SELECT reset_token_hash FROM Usuario WHERE id = $1',
      [ids.clienteUsuarioId]
    )
    expect(fila.rows[0].reset_token_hash).toBeNull()

    var aud = await queryTest(
      "SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE accion = 'CONTRASENA_RESTABLECIDA' AND resultado = 'exito'"
    )
    expect(aud.rows[0].n).toBeGreaterThanOrEqual(1)
  })

  it('AUD-AT-07 el restablecimiento es atomico: si la auditoria falla no cambia la contrasena ni consume el token', async () => {
    var tokenPlano = crypto.randomBytes(32).toString('hex')
    var tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex')
    await guardarTokenRecuperacion(ids.clienteUsuarioId, tokenPlano)

    var antes = await queryTest(
      'SELECT contrasena, reset_token_hash FROM Usuario WHERE id = $1',
      [ids.clienteUsuarioId]
    )

    await simularFallaAuditoria()

    var r = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: tokenPlano, nuevaContrasena: 'NuevaClave99*' })

    expect(r.status).toBe(500)

    var despues = await queryTest(
      'SELECT contrasena, reset_token_hash FROM Usuario WHERE id = $1',
      [ids.clienteUsuarioId]
    )
    expect(despues.rows[0].contrasena).toBe(antes.rows[0].contrasena)
    expect(despues.rows[0].reset_token_hash).toBe(tokenHash)
  })
})
