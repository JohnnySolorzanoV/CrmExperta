import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import {
  verificarBasePruebasDisponible,
  queryTest,
  resetearBasePruebas,
  sembrarUsuariosBase,
} from '../helpers/dbTestUtils.js'

async function estadoUsuario(id) {
  var r = await queryTest('SELECT activo FROM Usuario WHERE id = $1', [id])
  return r.rows[0]?.activo
}

async function contarAuditoria(where, params = []) {
  var r = await queryTest(
    `SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE ${where}`,
    params
  )
  return r.rows[0].n
}

describe('Integracion sesiones de usuarios desactivados', () => {
  var ids
  var tokenAdmin

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenAdmin = crearTokenTest({ id: ids.adminUsuarioId, correo: 'admin@test.com', roles: ['administrador'] })
  })

  it('DES-01 el token emitido deja de autorizar despues de desactivar al usuario, y no puede reiniciar sesion', async () => {
    var login = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: ids.passwordPlano })
    expect(login.status).toBe(200)
    var tokenViejo = login.body.token

    // Antes de desactivar el token funciona.
    var antes = await request(APP)
      .get('/api/citas/cliente/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenViejo)
    expect(antes.status).toBe(200)

    var des = await request(APP)
      .put('/api/usuarios/' + ids.clienteUsuarioId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ activo: false })
    expect(des.status).toBe(200)
    expect(await estadoUsuario(ids.clienteUsuarioId)).toBe(false)

    // El token viejo ya no autoriza.
    var despues = await request(APP)
      .get('/api/citas/cliente/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenViejo)
    expect(despues.status).toBe(403)

    // Un nuevo intento de inicio de sesion tambien se rechaza.
    var reintento = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: ids.passwordPlano })
    expect(reintento.status).toBe(403)
  })

  it('DES-02 la desactivacion y los intentos posteriores quedan auditados', async () => {
    var login = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: ids.passwordPlano })
    var tokenViejo = login.body.token

    await request(APP)
      .put('/api/usuarios/' + ids.clienteUsuarioId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ activo: false })

    // La desactivacion queda registrada como exito.
    expect(await contarAuditoria(
      "accion = 'DESACTIVAR' AND recurso = 'Usuario' AND recurso_id = $1 AND resultado = 'exito'",
      [ids.clienteUsuarioId]
    )).toBeGreaterThanOrEqual(1)

    // Los accesos rechazados con el token viejo quedan auditados como fallido.
    var bloqueado = await request(APP)
      .get('/api/citas/cliente/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenViejo)
    expect(bloqueado.status).toBe(403)
    expect(await contarAuditoria(
      "resultado = 'fallido' AND detalle LIKE '%desactivada%'"
    )).toBeGreaterThanOrEqual(1)

    // El reintento de login fallido tambien queda auditado.
    await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: ids.passwordPlano })
    expect(await contarAuditoria(
      "resultado = 'fallido' AND accion = 'LOGIN'"
    )).toBeGreaterThanOrEqual(1)
  })

  it('DES-03 al reactivar la cuenta el token emitido vuelve a autorizar', async () => {
    var tokenViejo = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })

    await request(APP)
      .put('/api/usuarios/' + ids.clienteUsuarioId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ activo: false })
    var bloqueado = await request(APP)
      .get('/api/citas/cliente/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenViejo)
    expect(bloqueado.status).toBe(403)

    await request(APP)
      .put('/api/usuarios/' + ids.clienteUsuarioId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ activo: true })

    var reactivado = await request(APP)
      .get('/api/citas/cliente/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenViejo)
    expect(reactivado.status).toBe(200)
  })

  it('DES-04 un usuario sin rol administrador no puede desactivar una cuenta', async () => {
    var tokenCliente = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
    var r = await request(APP)
      .put('/api/usuarios/' + ids.abogadoUsuarioId + '/estado')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ activo: false })
    expect(r.status).toBe(403)
    // La cuenta del abogado permanece activa.
    expect(await estadoUsuario(ids.abogadoUsuarioId)).toBe(true)
  })
})