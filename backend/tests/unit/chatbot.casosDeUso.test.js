import { beforeEach, describe, expect, it, vi } from 'vitest'

var repo = {
  obtenerHistorial: vi.fn(),
  crear: vi.fn(),
  actualizarLog: vi.fn(),
}

var db = {
  ejecutarConsulta: vi.fn(),
}

var poe = {
  preguntarAI: vi.fn(),
}

vi.mock('../../modulos/chatbot/chatbot.repositorio.js', () => repo)
vi.mock('../../config/database.js', () => db)
vi.mock('../../config/poe.js', () => poe)

describe('chatbot.casosDeUso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('UNIT-CHATBOT-01 consultar rechaza solicitudes cuando el mensaje esta vacio', async () => {
    var { consultar } = await import('../../modulos/chatbot/chatbot.casosDeUso.js')
    await expect(consultar({ idUsuario: 1, mensaje: '' })).rejects.toMatchObject({ status: 400 })
  })

  it('UNIT-CHATBOT-02 consultar interpreta la accion de agendar cuando la IA responde JSON valido', async () => {
    repo.obtenerHistorial.mockResolvedValue([])
    repo.crear.mockResolvedValue({ id: 55 })
    repo.actualizarLog.mockResolvedValue(undefined)
    db.ejecutarConsulta.mockResolvedValue({ rows: [] })
    poe.preguntarAI.mockResolvedValue('{"accion":"agendar","resumen":"Resumen test","tipoConsulta":"Civil","motivo":"Cobro"}')

    var { consultar } = await import('../../modulos/chatbot/chatbot.casosDeUso.js')
    var r = await consultar({ idUsuario: 1, mensaje: 'quiero agendar' })
    expect(r.consultaId).toBe(55)
    expect(r.agendar?.accion).toBe('agendar')
  })
})
