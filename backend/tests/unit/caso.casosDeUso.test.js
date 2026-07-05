import { beforeEach, describe, expect, it, vi } from 'vitest'

var mockRepo = {
  crear: vi.fn(),
  actualizarEstado: vi.fn(),
}

var mockDb = {
  ejecutarConsulta: vi.fn(),
}

vi.mock('../../modulos/casos/caso.repositorio.js', () => mockRepo)
vi.mock('../../config/database.js', () => mockDb)

describe('caso.casosDeUso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('actualizarEstadoCaso rechaza estado invalido', async () => {
    var { actualizarEstadoCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    await expect(actualizarEstadoCaso(11, 'inventado')).rejects.toMatchObject({
      message: 'Estado invalido',
      status: 400,
    })
  })

  it('crearCaso rechaza datos requeridos faltantes', async () => {
    var { crearCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    await expect(crearCaso({ tipoCaso: 'civil' })).rejects.toMatchObject({
      message: 'Faltan datos del caso',
      status: 400,
    })
  })

  it('crearCaso rechaza cuando cliente no existe', async () => {
    mockDb.ejecutarConsulta
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    var { crearCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    await expect(
      crearCaso({
        tipoCaso: 'civil',
        nombreCaso: 'Cobro',
        idCliente: 12,
        idAbogado: 20,
      })
    ).rejects.toMatchObject({
      message: 'Cliente no encontrado',
      status: 404,
    })
  })
})
