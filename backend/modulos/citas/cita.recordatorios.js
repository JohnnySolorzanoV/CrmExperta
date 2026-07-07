import { ejecutarConsulta } from '../../config/database.js'
import { enviarEmail } from '../../config/google.js'

var ESTADOS_RECORDATORIO = ['pendiente', 'confirmada', 'reprogramada']
var INTERVALO_MS = 15 * 60 * 1000

function formatearFechaLegible(fecha) {
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fecha))
}

export async function enviarRecordatoriosPendientes() {
  var r = await ejecutarConsulta(
    `SELECT
      c.id,
      c.fecha_hora_copia AS fecha,
      c.motivo,
      uc.nombre AS nombre_cliente,
      uc.correo AS correo_cliente,
      ua.nombre AS nombre_abogado,
      ua.correo AS correo_abogado
     FROM Cita c
     JOIN Cliente cl ON cl.id = c.id_cliente
     JOIN Usuario uc ON uc.id = cl.id_usuario
     JOIN Abogado ab ON ab.id = c.id_abogado
     JOIN Usuario ua ON ua.id = ab.id_usuario
     WHERE c.estado_cita = ANY($1::text[])
       AND c.recordatorio_enviado = FALSE
       AND c.fecha_hora_copia BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
     ORDER BY c.fecha_hora_copia`,
    [ESTADOS_RECORDATORIO]
  )

  for (var cita of r.rows) {
    var fechaLegible = formatearFechaLegible(cita.fecha)
    var motivo = cita.motivo || 'No especificado'

    try {
      await Promise.all([
        enviarEmail({
          para: cita.correo_cliente,
          asunto: 'Recordatorio: tienes una cita mañana',
          titulo: 'Recordatorio de cita',
          lineas: [
            `Hola <strong>${cita.nombre_cliente}</strong>,`,
            `Te recordamos tu cita con <strong>${cita.nombre_abogado}</strong> para el <strong>${fechaLegible}</strong>.`,
            `<strong>Motivo:</strong> ${motivo}`,
          ],
        }),
        enviarEmail({
          para: cita.correo_abogado,
          asunto: 'Recordatorio: tienes una cita mañana',
          titulo: 'Recordatorio de cita',
          lineas: [
            `Te recordamos la cita con <strong>${cita.nombre_cliente}</strong> para el <strong>${fechaLegible}</strong>.`,
            `<strong>Motivo:</strong> ${motivo}`,
            'Ingresa al sistema si necesitas actualizar o gestionar la cita.',
          ],
        }),
      ])

      await ejecutarConsulta(
        'UPDATE Cita SET recordatorio_enviado = TRUE WHERE id = $1 AND recordatorio_enviado = FALSE',
        [cita.id]
      )
    } catch (e) {
      console.error('[Recordatorios] cita id=' + cita.id + ':', e.message)
    }
  }
}

export function iniciarSchedulerRecordatorios() {
  var enPruebas = process.env.NODE_ENV === 'test' || process.env.VITEST
  if (enPruebas) return null

  enviarRecordatoriosPendientes().catch((e) => {
    console.error('[Recordatorios] Error en corrida inicial:', e.message)
  })

  return setInterval(() => {
    enviarRecordatoriosPendientes().catch((e) => {
      console.error('[Recordatorios] Error en scheduler:', e.message)
    })
  }, INTERVALO_MS)
}
