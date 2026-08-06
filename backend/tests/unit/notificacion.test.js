import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

var mockDb = { ejecutarConsulta: vi.fn() }
var mockGoogle = { enviarEmail: vi.fn() }

vi.mock('../../config/database.js', () => mockDb)
vi.mock('../../config/google.js', () => mockGoogle)

describe('notificacion.servicio - estados', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.NOTIFICACION_TIMEOUT_MS
    delete process.env.VITEST
    process.env.NODE_ENV = 'test'
  })

  it('un envio exitoso marca la notificacion como enviada, no como fallida', async () => {
    mockDb.ejecutarConsulta.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente' }] })
    mockGoogle.enviarEmail.mockResolvedValue({ estado: 'exito', messageId: 'm1' })

    var { enviarRegistro } = await import('../../modulos/notificacion/notificacion.servicio.js')
    var r = await enviarRegistro({ id: 1, destinatario: 'x@y.com', asunto: 'A', titulo: 'T', lineas: ['hola'] })

    expect(r.estado).toBe('enviada')
    expect(mockGoogle.enviarEmail).toHaveBeenCalledTimes(1)
    var enviada = mockDb.ejecutarConsulta.mock.calls.find(([sql]) => sql.includes("SET estado = 'enviada'"))
    expect(enviada).toBeTruthy()
    var fallida = mockDb.ejecutarConsulta.mock.calls.find(([sql]) => sql.includes("SET estado = 'fallida'"))
    expect(fallida).toBeUndefined()
  })

  it('un envio fallido marca la notificacion como fallida y NUNCA como enviada', async () => {
    mockDb.ejecutarConsulta.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente' }] })
    mockGoogle.enviarEmail.mockResolvedValue({ estado: 'fallido', detalle: 'SMTP no disponible' })

    var { enviarRegistro } = await import('../../modulos/notificacion/notificacion.servicio.js')
    var r = await enviarRegistro({ id: 1, destinatario: 'x@y.com', asunto: 'A', titulo: 'T', lineas: [] })

    expect(r.estado).toBe('fallida')
    var fallida = mockDb.ejecutarConsulta.mock.calls.find(([sql]) => sql.includes("SET estado = 'fallida'"))
    expect(fallida).toBeTruthy()
    var enviada = mockDb.ejecutarConsulta.mock.calls.find(([sql]) => sql.includes("SET estado = 'enviada'"))
    expect(enviada).toBeUndefined()
  })

  it('un timeout del servicio externo queda como fallida sin exponer al destinatario', async () => {
    process.env.NOTIFICACION_TIMEOUT_MS = '10'
    mockDb.ejecutarConsulta.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente' }] })
    mockGoogle.enviarEmail.mockImplementation(() => new Promise(() => {}))

    var { enviarRegistro } = await import('../../modulos/notificacion/notificacion.servicio.js')
    var r = await enviarRegistro({ id: 1, destinatario: 'cliente@privado.com', asunto: 'A', titulo: 'T', lineas: [] })

    expect(r.estado).toBe('fallida')
    var fallida = mockDb.ejecutarConsulta.mock.calls.find(([sql]) => sql.includes("SET estado = 'fallida'"))
    expect(fallida).toBeTruthy()
  })
})

describe('notificacion.servicio - reprocesamiento', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reprocesa una fallida y la pasa a enviada cuando el remoto se recupera', async () => {
    mockDb.ejecutarConsulta.mockResolvedValueOnce({
      rows: [{ id: 9, intentos: 1, estado: 'fallida', destinatario: 'a@b.com', asunto: 'A', titulo: 'T', lineas: [] }],
    })
    mockGoogle.enviarEmail.mockResolvedValue({ estado: 'exito', messageId: 'm2' })

    var { reprocesarNotificacionesFallidas } = await import('../../modulos/notificacion/notificacion.servicio.js')
    var resumen = await reprocesarNotificacionesFallidas()

    expect(resumen.enviadas).toBe(1)
    expect(resumen.fallidas).toBe(0)
    var enviada = mockDb.ejecutarConsulta.mock.calls.find(([sql]) => sql.includes("SET estado = 'enviada'"))
    expect(enviada).toBeTruthy()
  })

  it('no reintenta mas alla del maximo de intentos', async () => {
    mockDb.ejecutarConsulta.mockResolvedValueOnce({
      rows: [{ id: 9, intentos: 3, estado: 'fallida', destinatario: 'a@b.com', asunto: 'A', titulo: 'T', lineas: [] }],
    })

    var { reprocesarNotificacionesFallidas } = await import('../../modulos/notificacion/notificacion.servicio.js')
    var resumen = await reprocesarNotificacionesFallidas()

    expect(mockGoogle.enviarEmail).not.toHaveBeenCalled()
    expect(resumen.enviadas).toBe(0)
    expect(resumen.fallidas).toBe(0)
  })
})