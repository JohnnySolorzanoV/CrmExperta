import { beforeEach, describe, expect, it, vi } from 'vitest'

var mockRepo = {
  buscarPorCorreo: vi.fn(),
  buscarPorIdentificacion: vi.fn(),
  crear: vi.fn(),
  crearCliente: vi.fn(),
  detectarRoles: vi.fn(),
}

vi.mock('../../modulos/auth/auth.repositorio.js', () => mockRepo)

describe('auth.casosDeUso - iniciarSesion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza cuando el correo no existe', async () => {
    mockRepo.buscarPorCorreo.mockResolvedValue(null)
    var { iniciarSesion } = await import('../../modulos/auth/auth.casosDeUso.js')

    await expect(iniciarSesion({ correo: 'x@test.com', contrasena: '123' }))
      .rejects
      .toMatchObject({ message: 'Correo o contraseña incorrectos', status: 401 })
  })

  it('retorna token y usuario cuando credenciales son validas', async () => {
    var bcrypt = await import('bcrypt')
    var passHash = await bcrypt.default.hash('Clave123*', 10)

    mockRepo.buscarPorCorreo.mockResolvedValue({
      id: 11,
      identificacion: '0101001010',
      nombre: 'Cliente Test',
      correo: 'cliente@test.com',
      contrasena: passHash,
    })
    mockRepo.detectarRoles.mockResolvedValue(['cliente'])

    var { iniciarSesion } = await import('../../modulos/auth/auth.casosDeUso.js')
    var r = await iniciarSesion({ correo: 'cliente@test.com', contrasena: 'Clave123*' })

    expect(r.token).toBeTruthy()
    expect(r.usuario).toMatchObject({
      id: 11,
      nombre: 'Cliente Test',
      correo: 'cliente@test.com',
      roles: ['cliente'],
    })
  })
})
