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

  it('UNIT-USUARIOS-01 agregarRol rechaza solicitudes con roles no permitidos', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 1 })
    var { agregarRol } = await import('../../modulos/usuarios/usuario.casosDeUso.js')
    await expect(agregarRol(1, 'superadmin')).rejects.toMatchObject({ status: 400 })
  })

  it('UNIT-USUARIOS-02 agregarRol exige datos adicionales cuando se asigna el rol de abogado', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 1 })
    var { agregarRol } = await import('../../modulos/usuarios/usuario.casosDeUso.js')
    await expect(agregarRol(1, 'abogado', {})).rejects.toMatchObject({ status: 400 })
  })

  it('UNIT-USUARIOS-03 obtenerUsuario incorpora los roles asociados al perfil consultado', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 8, nombre: 'User' })
    repo.obtenerRoles.mockResolvedValue(['cliente'])
    var { obtenerUsuario } = await import('../../modulos/usuarios/usuario.casosDeUso.js')
    var r = await obtenerUsuario(8)
    expect(r.roles).toEqual(['cliente'])
  })
})
