import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { dbPruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/auth', () => {
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    await sembrarUsuariosBase()
  })

  it('POST /api/auth/login responde 200 con token si credenciales validas', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: 'Clave123*' })

    expect(r.status).toBe(200)
    expect(r.body.token).toBeTruthy()
    expect(r.body.usuario?.correo).toBe('cliente@test.com')
  })

  it('POST /api/auth/login responde 401 con credenciales invalidas', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: 'mala-clave' })

    expect(r.status).toBe(401)
    expect(r.body.error).toBe('Correo o contraseña incorrectos')
  })
})
