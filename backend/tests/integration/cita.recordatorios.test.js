import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

vi.mock('../../config/google.js', () => ({
  enviarEmail: vi.fn().mockResolvedValue({ estado: 'exito' }),
}))

describe('Integracion recordatorios de citas (RF06)', () => {
  var ids
  var calendarioId
  var citaId

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()

    var cal = await queryTest(
      'INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, $3) RETURNING id',
      [ids.abogadoPkId, new Date(Date.now() + 3 * 3600 * 1000).toISOString(), 'Slot']
    )
    calendarioId = cal.rows[0].id

    // Cita dentro de las próximas 24h, con recordatorio pendiente.
    var cita = await queryTest(
      `INSERT INTO Cita (id_cliente, id_abogado, fecha_hora_copia, id_calendario, motivo, estado_cita, recordatorio_enviado)
       VALUES ($1, $2, $3, $4, $5, 'confirmada', FALSE)
       RETURNING id`,
      [ids.clientePkId, ids.abogadoPkId, new Date(Date.now() + 5 * 3600 * 1000).toISOString(), calendarioId, 'Seguimiento']
    )
    citaId = cita.rows[0].id
  })

  it('RF06-01 enviarRecordatoriosPendientes marca recordatorio_enviado y no lo repite', async () => {
    var { enviarRecordatoriosPendientes } = await import('../../modulos/citas/cita.recordatorios.js')
    var google = await import('../../config/google.js')

    await enviarRecordatoriosPendientes()
    var fila = await queryTest('SELECT recordatorio_enviado FROM Cita WHERE id = $1', [citaId])
    expect(fila.rows[0].recordatorio_enviado).toBe(true)
    expect(google.enviarEmail).toHaveBeenCalledTimes(2)

    // Segunda corrida: ya no debe reenviar ni actualizar nada.
    google.enviarEmail.mockClear()
    await enviarRecordatoriosPendientes()
    expect(google.enviarEmail).not.toHaveBeenCalled()
  })
})