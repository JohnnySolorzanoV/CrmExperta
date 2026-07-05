import { beforeEach, describe, expect, it, vi } from 'vitest'

var repo = {
  obtenerPorAbogado: vi.fn(),
  crear: vi.fn(),
  eliminar: vi.fn(),
}

var db = {
  ejecutarConsulta: vi.fn(),
}

vi.mock('../../modulos/calendario/calendario.repositorio.js', () => repo)
vi.mock('../../config/database.js', () => db)

describe('calendario.casosDeUso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listarSlots retorna 404 si abogado no existe', async () => {
    db.ejecutarConsulta.mockResolvedValue({ rows: [] })
    var { listarSlots } = await import('../../modulos/calendario/calendario.casosDeUso.js')
    await expect(listarSlots(999)).rejects.toMatchObject({ status: 404 })
  })

  it('crearSlot requiere datos minimos', async () => {
    var { crearSlot } = await import('../../modulos/calendario/calendario.casosDeUso.js')
    await expect(crearSlot({ idAbogado: 1 })).rejects.toMatchObject({ status: 400 })
  })

  it('eliminarSlot retorna mensaje cuando elimina', async () => {
    repo.eliminar.mockResolvedValue(true)
    var { eliminarSlot } = await import('../../modulos/calendario/calendario.casosDeUso.js')
    var r = await eliminarSlot(2)
    expect(r).toEqual({ mensaje: 'Slot eliminado' })
  })
})
