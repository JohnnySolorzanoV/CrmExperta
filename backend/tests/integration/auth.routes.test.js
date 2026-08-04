import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/auth', () => {

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    await sembrarUsuariosBase()
  })

  it('INT-AUTH-01 POST /api/auth/login retorna token cuando las credenciales son validas', async () => {
    var r = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: 'Clave123*' })

    expect(r.status).toBe(200)
    expect(r.body.token).toBeTruthy()
    expect(r.body.usuario?.correo).toBe('cliente@test.com')
  })

  it('INT-AUTH-02 POST /api/auth/login rechaza credenciales invalidas con estado 401', async () => {
    var r = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: 'mala-clave' })

    expect(r.status).toBe(401)
    expect(r.body.error).toBe('Correo o contraseña incorrectos')
  })

  it('RF17-01 POST /api/auth/recuperar-contrasena no revela si el correo existe', async () => {
    var inexistente = await request(APP)
      .post('/api/auth/recuperar-contrasena')
      .send({ correo: 'no-existe@test.com' })

    expect(inexistente.status).toBe(200)
    expect(inexistente.body.mensaje).toContain('Si el correo existe')
  })

  it('RF17-02 POST /api/auth/restablecer-contrasena exige token y contrasena minima', async () => {
    var sinToken = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: '', nuevaContrasena: 'NuevaClave123' })
    expect(sinToken.status).toBe(400)

    var corta = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: 'abc', nuevaContrasena: '1234567' })
    expect(corta.status).toBe(400)

    var tokenInvalido = await request(APP)
      .post('/api/auth/restablecer-contrasena')
      .send({ token: 'no-existe', nuevaContrasena: 'NuevaClave123' })
    expect(tokenInvalido.status).toBe(400)
  })
})
