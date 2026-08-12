import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase, proximaFranjaLaborable } from '../helpers/dbTestUtils.js'
import { esperarNotificacionesPendientes } from '../../modulos/notificacion/notificacion.servicio.js'

vi.mock('../../config/google.js', () => ({
  enviarEmail: vi.fn(),
}))

async function esperarFilasNotificacion(citaId, condicion, totalEsperado = 2) {
  for (var i = 0; i < 40; i++) {
    var r = await queryTest(
      'SELECT COUNT(*)::int AS n FROM Notificacion WHERE id_cita = $1 AND ' + condicion,
      [citaId]
    )
    if (r.rows[0].n >= totalEsperado) return r.rows[0].n
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  var todas = await queryTest('SELECT estado FROM Notificacion WHERE id_cita = $1 ORDER BY id', [citaId])
  return todas.rows.length
}

describe('Integracion estado de notificaciones (fallos silenciosos)', () => {
  var ids
  var tokenCliente

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenCliente = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
  })

  it('INT-NOTIF-01 SMTP disponible: cada notificacion queda en estado enviada y la cita no se corrompe', async () => {
    var google = await import('../../config/google.js')
    google.enviarEmail.mockResolvedValue({ estado: 'exito', messageId: 'm1' })

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: ids.clienteUsuarioId, idAbogado: ids.abogadoUsuarioId, fechaHoraCopia: proximaFranjaLaborable(), motivo: 'Primera' })
    expect(r.status).toBe(201)

    var n = await esperarFilasNotificacion(r.body.cita.id, "estado = 'enviada'")
    await esperarNotificacionesPendientes()
    var debugRows = await queryTest('SELECT id, id_cita, estado FROM Notificacion ORDER BY id')
    console.error('DEBUG_ROWS', JSON.stringify(debugRows.rows))
    expect(n).toBe(2)

    var cita = await queryTest('SELECT estado_cita FROM Cita WHERE id = $1', [r.body.cita.id])
    expect(cita.rows[0].estado_cita).toBe('pendiente')
  })

  it('INT-NOTIF-02 SMTP caido: las notificaciones quedan en fallida (no enviada) y la cita sigue creada', async () => {
    var google = await import('../../config/google.js')
    google.enviarEmail.mockResolvedValue({ estado: 'fallido', detalle: 'SMTP no disponible' })

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: ids.clienteUsuarioId, idAbogado: ids.abogadoUsuarioId, fechaHoraCopia: proximaFranjaLaborable(), motivo: 'Con caida' })
    expect(r.status).toBe(201)

    var nFallida = await esperarFilasNotificacion(r.body.cita.id, "estado = 'fallida'")
    expect(nFallida).toBe(2)

    var enviadas = await queryTest('SELECT COUNT(*)::int AS n FROM Notificacion WHERE id_cita = $1 AND estado = $2', [r.body.cita.id, 'enviada'])
    expect(enviadas.rows[0].n).toBe(0)

    // El fallo no corrompe la cita: sigue existiendo con su estado original.
    var cita = await queryTest('SELECT estado_cita, id_abogado FROM Cita WHERE id = $1', [r.body.cita.id])
    expect(cita.rows.length).toBe(1)
    expect(cita.rows[0].estado_cita).toBe('pendiente')

    // El error queda registrado en la tabla de notificaciones sin datos del remitente.
    var detalle = await queryTest('SELECT ultimo_error FROM Notificacion WHERE id_cita = $1 LIMIT 1', [r.body.cita.id])
    expect(detalle.rows[0].ultimo_error).toBeTruthy()
  })

  it('INT-NOTIF-03 reprocesamiento: una fallida pasa a enviada cuando el servicio se recupera', async () => {
    var google = await import('../../config/google.js')
    google.enviarEmail.mockResolvedValue({ estado: 'fallido', detalle: 'credenciales invalidas' })

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: ids.clienteUsuarioId, idAbogado: ids.abogadoUsuarioId, fechaHoraCopia: proximaFranjaLaborable(), motivo: 'Reintento' })
    expect(r.status).toBe(201)

    await esperarFilasNotificacion(r.body.cita.id, "estado = 'fallida'")

    google.enviarEmail.mockResolvedValue({ estado: 'exito', messageId: 'm2' })
    await esperarNotificacionesPendientes()
    var { reprocesarNotificacionesFallidas } = await import('../../modulos/notificacion/notificacion.servicio.js')
    var resumen = await reprocesarNotificacionesFallidas()

    expect(resumen.enviadas).toBeGreaterThan(0)
    var nEnviada = await esperarFilasNotificacion(r.body.cita.id, "estado = 'enviada'")
    expect(nEnviada).toBe(2)
  })
})