import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'

describe('Integracion /api/usuarios', () => {
  var baseIds
  var tokenAdmin

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()
    tokenAdmin = crearTokenTest({
      id: baseIds.adminUsuarioId,
      correo: 'admin@test.com',
      roles: ['administrador'],
    })
  })

  it('INT-USUARIOS-01 GET /api/usuarios responde con una coleccion de usuarios', async () => {
    var r = await request(APP)
      .get('/api/usuarios')
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.usuarios)).toBe(true)
  })

  it('INT-USUARIOS-02 GET /api/usuarios responde 401 si no se envia token', async () => {
    var r = await request(APP).get('/api/usuarios')
    expect(r.status).toBe(401)
  })

  it('INT-USUARIOS-03 GET /api/usuarios responde 403 para un cliente sin rol administrador', async () => {
    var tokenCliente = crearTokenTest({
      id: baseIds.clienteUsuarioId,
      correo: 'cliente@test.com',
      roles: ['cliente'],
    })
    var r = await request(APP)
      .get('/api/usuarios')
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(r.status).toBe(403)
  })

  it('INT-USUARIOS-04 GET /api/usuarios responde 403 para un abogado sin rol administrador', async () => {
    var tokenAbogado = crearTokenTest({
      id: baseIds.abogadoUsuarioId,
      correo: 'abogado@test.com',
      roles: ['abogado'],
    })
    var r = await request(APP)
      .get('/api/usuarios')
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(r.status).toBe(403)
  })
})