import { beforeEach, describe, expect, it, vi } from 'vitest'

var repo = {
  crear: vi.fn(),
  obtenerTodos: vi.fn(),
  buscarPorId: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
  asignarRol: vi.fn(),
  quitarRol: vi.fn(),
  obtenerRoles: vi.fn(),
}

vi.mock('../../modulos/usuarios/usuario.repositorio.js', () => repo)

describe('usuario.casosDeUso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('agregarRol rechaza rol invalido', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 1 })
    var { agregarRol } = await import('../../modulos/usuarios/usuario.casosDeUso.js')
    await expect(agregarRol(1, 'superadmin')).rejects.toMatchObject({ status: 400 })
  })

  it('agregarRol abogado exige datos extra', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 1 })
    var { agregarRol } = await import('../../modulos/usuarios/usuario.casosDeUso.js')
    await expect(agregarRol(1, 'abogado', {})).rejects.toMatchObject({ status: 400 })
  })

  it('obtenerUsuario carga roles', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 8, nombre: 'User' })
    repo.obtenerRoles.mockResolvedValue(['cliente'])
    var { obtenerUsuario } = await import('../../modulos/usuarios/usuario.casosDeUso.js')
    var r = await obtenerUsuario(8)
    expect(r.roles).toEqual(['cliente'])
  })
})
