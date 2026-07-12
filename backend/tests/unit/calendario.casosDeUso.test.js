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

  it('UNIT-CALENDARIO-01 listarSlots retorna 404 cuando el abogado solicitado no existe', async () => {
    db.ejecutarConsulta.mockResolvedValue({ rows: [] })
    var { listarSlots } = await import('../../modulos/calendario/calendario.casosDeUso.js')
    await expect(listarSlots(999)).rejects.toMatchObject({ status: 404 })
  })

  it('UNIT-CALENDARIO-02 crearSlot rechaza solicitudes sin los campos obligatorios', async () => {
    var { crearSlot } = await import('../../modulos/calendario/calendario.casosDeUso.js')
    await expect(crearSlot({ idAbogado: 1 })).rejects.toMatchObject({ status: 400 })
  })

  it('UNIT-CALENDARIO-03 eliminarSlot retorna un mensaje de confirmacion cuando elimina el registro', async () => {
    repo.eliminar.mockResolvedValue(true)
    var { eliminarSlot } = await import('../../modulos/calendario/calendario.casosDeUso.js')
    var r = await eliminarSlot(2)
    expect(r).toEqual({ mensaje: 'Slot eliminado' })
  })
})
