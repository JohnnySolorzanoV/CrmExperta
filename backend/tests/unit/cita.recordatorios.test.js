import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

var mockDb = {
  ejecutarConsulta: vi.fn(),
}

var mockGoogle = {
  enviarEmail: vi.fn(),
}

vi.mock('../../config/database.js', () => mockDb)
vi.mock('../../config/google.js', () => mockGoogle)

describe('cita.recordatorios', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    delete process.env.VITEST
    process.env.NODE_ENV = 'test'
  })

  it('UNIT-CITAS-01 enviarRecordatoriosPendientes notifica a cliente y abogado y marca la cita como recordada', async () => {
    mockDb.ejecutarConsulta
      .mockResolvedValueOnce({
        rows: [{
          id: 77,
          fecha: '2026-08-01T10:15:00.000Z',
          motivo: 'Seguimiento',
          nombre_cliente: 'Cliente Uno',
          correo_cliente: 'cliente@test.com',
          nombre_abogado: 'Abogada Uno',
          correo_abogado: 'abogada@test.com',
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
    mockGoogle.enviarEmail.mockResolvedValue(null)

    var { enviarRecordatoriosPendientes } = await import('../../modulos/citas/cita.recordatorios.js')
    await enviarRecordatoriosPendientes()

    expect(mockGoogle.enviarEmail).toHaveBeenCalledTimes(2)
    expect(mockDb.ejecutarConsulta).toHaveBeenCalledTimes(2)
    expect(mockDb.ejecutarConsulta).toHaveBeenLastCalledWith(
      'UPDATE Cita SET recordatorio_enviado = TRUE WHERE id = $1 AND recordatorio_enviado = FALSE',
      [77]
    )
  })

  it('UNIT-CITAS-02 enviarRecordatoriosPendientes no ejecuta envios ni actualizaciones cuando no existen citas elegibles', async () => {
    mockDb.ejecutarConsulta.mockResolvedValueOnce({ rows: [] })
    var { enviarRecordatoriosPendientes } = await import('../../modulos/citas/cita.recordatorios.js')

    await enviarRecordatoriosPendientes()

    expect(mockGoogle.enviarEmail).not.toHaveBeenCalled()
    expect(mockDb.ejecutarConsulta).toHaveBeenCalledTimes(1)
  })

  it('UNIT-CITAS-03 iniciarSchedulerRecordatorios no programa intervalos en entorno de pruebas', async () => {
    process.env.NODE_ENV = 'test'
    process.env.VITEST = '1'
    var setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    var { iniciarSchedulerRecordatorios } = await import('../../modulos/citas/cita.recordatorios.js')

    var scheduler = iniciarSchedulerRecordatorios()

    expect(scheduler).toBeNull()
    expect(setIntervalSpy).not.toHaveBeenCalled()
  })

  it('UNIT-CITAS-04 iniciarSchedulerRecordatorios ejecuta una corrida inicial y agenda el intervalo en entorno no test', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.VITEST
    mockDb.ejecutarConsulta.mockResolvedValue({ rows: [] })
    var setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue({ __scheduler: true })
    var { iniciarSchedulerRecordatorios } = await import('../../modulos/citas/cita.recordatorios.js')

    var scheduler = iniciarSchedulerRecordatorios()

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(scheduler).toEqual({ __scheduler: true })
    expect(mockDb.ejecutarConsulta).toHaveBeenCalled()
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy.mock.calls[0][1]).toBe(15 * 60 * 1000)
  })
})
