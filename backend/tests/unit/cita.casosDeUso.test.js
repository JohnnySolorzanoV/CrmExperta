import { beforeEach, describe, expect, it, vi } from 'vitest'

var mockRepo = {
  buscarPorId: vi.fn(),
  existeConflictoAbogado: vi.fn(),
  slotOcupado: vi.fn(),
  crear: vi.fn(),
  cancelarConMotivo: vi.fn(),
  actualizarEstado: vi.fn(),
  actualizarFecha: vi.fn(),
}

var mockDb = {
  ejecutarConsulta: vi.fn(),
}

vi.mock('../../modulos/citas/cita.repositorio.js', () => mockRepo)
vi.mock('../../config/database.js', () => mockDb)
vi.mock('../../config/google.js', () => ({
  enviarEmail: vi.fn().mockResolvedValue(null),
}))

describe('cita.casosDeUso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('agendarCita falla por datos faltantes', async () => {
    var { agendarCita } = await import('../../modulos/citas/cita.casosDeUso.js')

    await expect(agendarCita({ idAbogado: 10 })).rejects.toMatchObject({
      message: 'Faltan datos requeridos para la cita',
      status: 400,
    })
  })

  it('agendarCita falla por conflicto de hora del abogado', async () => {
    mockDb.ejecutarConsulta
      .mockResolvedValueOnce({ rows: [{ id: 200 }] })
      .mockResolvedValueOnce({ rows: [{ id: 300 }] })
    mockRepo.existeConflictoAbogado.mockResolvedValue(true)

    var { agendarCita } = await import('../../modulos/citas/cita.casosDeUso.js')

    await expect(
      agendarCita({
        idCliente: 1,
        idAbogado: 2,
        fechaHoraCopia: '2026-07-05T14:00:00.000Z',
        motivo: 'Consulta',
      })
    ).rejects.toMatchObject({
      message: 'Este abogado ya tiene una cita en esa hora',
      status: 409,
    })
  })

  it('cancelarCita devuelve 404 si no existe', async () => {
    mockRepo.cancelarConMotivo.mockResolvedValue(null)
    var { cancelarCita } = await import('../../modulos/citas/cita.casosDeUso.js')
    await expect(cancelarCita(999, {})).rejects.toMatchObject({ status: 404 })
  })

  it('aceptarCita devuelve 404 si no existe', async () => {
    mockRepo.actualizarEstado.mockResolvedValue(null)
    var { aceptarCita } = await import('../../modulos/citas/cita.casosDeUso.js')
    await expect(aceptarCita(999)).rejects.toMatchObject({ status: 404 })
  })

  it('reprogramarCita devuelve 404 si no existe', async () => {
    mockRepo.buscarPorId.mockResolvedValue(null)
    var { reprogramarCita } = await import('../../modulos/citas/cita.casosDeUso.js')
    await expect(reprogramarCita(999, '2026-07-06T10:00:00.000Z', null)).rejects.toMatchObject({ status: 404 })
  })
})
