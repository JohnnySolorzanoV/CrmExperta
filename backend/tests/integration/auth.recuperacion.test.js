import request from 'supertest'
import crypto from 'node:crypto'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import {
  verificarBasePruebasDisponible,
  queryTest,
  resetearBasePruebas,
  sembrarUsuariosBase,
} from '../helpers/dbTestUtils.js'

function hashear(tokenPlano) {
  return crypto.createHash('sha256').update(tokenPlano).digest('hex')
}

async function guardarToken(idUsuario, tokenPlano, { expirado = false } = {}) {
  var tokenHash = hashear(tokenPlano)
  var expira = expirado ? "NOW() - INTERVAL '1 second'" : "NOW() + INTERVAL '1 hour'"
  await queryTest(
    `UPDATE Usuario
     SET reset_token_hash = $1, reset_token_expira = ${expira}
     WHERE id = $2`,
    [tokenHash, idUsuario]
  )
}

async function datosReset(idUsuario) {
  var r = await queryTest(
    'SELECT reset_token_hash, reset_token_expira FROM Usuario WHERE id = $1',
    [idUsuario]
  )
  return r.rows[0]
}

async function intentarLogin(correo, contrasena) {
  return request(APP)
    .post('/api/auth/login')
    .send({ correo, contrasena })
}

async function contarAuditoria(where, params = []) {
  var r = await queryTest(
    `SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE ${where}`,
    params
  )
  return r.rows[0].n
}

describe('Integracion recuperacion de contrasena', () => {
  var ids
  var NUEVA = 'NuevaClave99*'

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
  })

  it('REC-01 el token valido restablece la contrasena: la nueva inicia sesion y la anterior deja de funcionar', async () => {
    var token = crypto.randomBytes(32).toString('hex')
    await guardarToken(ids.clienteUsuarioId, token)

    var r = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token, nuevaContrasena: NUEVA })
    expect(r.status).toBe(200)

    var vieja = await intentarLogin('cliente@test.com', ids.passwordPlano)
    expect(vieja.status).toBe(401)

    var nueva = await intentarLogin('cliente@test.com', NUEVA)
    expect(nueva.status).toBe(200)

    // El token quedó consumido (hash y expiración limpiados).
    var reset = await datosReset(ids.clienteUsuarioId)
    expect(reset.reset_token_hash).toBeNull()
    expect(reset.reset_token_expira).toBeNull()
  })

  it('REC-02 un token vencido se rechaza y no cambia la contrasena', async () => {
    var token = crypto.randomBytes(32).toString('hex')
    await guardarToken(ids.clienteUsuarioId, token, { expirado: true })

    var r = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token, nuevaContrasena: NUEVA })
    expect(r.status).toBe(400)

    // La contraseña anterior sigue funcionando.
    var login = await intentarLogin('cliente@test.com', ids.passwordPlano)
    expect(login.status).toBe(200)
  })

  it('REC-03 un token consumido no puede reutilizarse', async () => {
    var token = crypto.randomBytes(32).toString('hex')
    await guardarToken(ids.clienteUsuarioId, token)

    var primero = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token, nuevaContrasena: NUEVA })
    expect(primero.status).toBe(200)

    // Reintento con el mismo token: rechazado y sin efectos.
    var reuso = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token, nuevaContrasena: 'OtraClave123*' })
    expect(reuso.status).toBe(400)

    var login = await intentarLogin('cliente@test.com', NUEVA)
    expect(login.status).toBe(200)
  })

  it('REC-04 el token se almacena como hash, nunca en texto plano', async () => {
    var token = crypto.randomBytes(32).toString('hex')
    await guardarToken(ids.clienteUsuarioId, token)

    var datos = await datosReset(ids.clienteUsuarioId)
    expect(datos.reset_token_hash).toBe(hashear(token))
    expect(datos.reset_token_hash).not.toBe(token)
    expect(datos.reset_token_hash).not.toContain(token)
  })

  it('REC-05 el restablecimiento exitoso y los intentos fallidos quedan auditados', async () => {
    var token = crypto.randomBytes(32).toString('hex')
    await guardarToken(ids.clienteUsuarioId, token)

    // Intento fallido con un token inválido.
    var fallido = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: 'token-que-no-existe', nuevaContrasena: NUEVA })
    expect(fallido.status).toBe(400)

    // Restablecimiento exitoso.
    var ok = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token, nuevaContrasena: NUEVA })
    expect(ok.status).toBe(200)

    expect(await contarAuditoria(
      "accion = 'CONTRASENA_RESTABLECIDA' AND resultado = 'exito'"
    )).toBeGreaterThanOrEqual(1)

    expect(await contarAuditoria(
      "resultado = 'fallido' AND detalle LIKE '%Token inválido%'"
    )).toBeGreaterThanOrEqual(1)
  })
})