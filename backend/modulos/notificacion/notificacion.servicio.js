import * as repo from './notificacion.repositorio.js'
import { enviarEmail } from '../../config/google.js'
import { log } from '../../config/logger.js'

// Motor de notificaciones con estado explicito (pendiente/enviada/fallida) y
// reintento controlado. Un fallo del servicio de correo NUNCA se silencia ni
// dano la operacion de negocio: la cita ya se persiscio y aqui solo se registra
// el desenlace del envio para poder reprocesarlo despues.

var INTENTOS_MAX = 3
var TIEMPO_ENVIO_MS = Number(process.env.NOTIFICACION_TIMEOUT_MS || 15000)
var INTERVALO_MS = 15 * 60 * 1000

// Registro de envios "fire-and-forget" aún en vuelo. Permite a las pruebas de
// integración esperar a que terminen antes de re-crear el esquema, evitando que
// una notificacion de un lote anterior colisione con un DROP TABLE (deadlock).
var pendientes = new Set()

function conTimeout(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, rechazar) =>
      setTimeout(() => rechazar(new Error('timeout al enviar notificacion')), ms)
    ),
  ])
}

// Envia un registro ya creado y actualiza su estado. Requiere una fila creada
// previamente (estado 'pendiente'). Un 'fallido' o 'omitido' nunca cuenta como
// enviado: queda en 'fallida' para que el reintento lo reprocese.
export async function enviarRegistro(reg) {
  var resultado
  try {
    resultado = await conTimeout(
      enviarEmail({
        para: reg.destinatario,
        asunto: reg.asunto,
        titulo: reg.titulo,
        lineas: Array.isArray(reg.lineas) ? reg.lineas : [],
      }),
      TIEMPO_ENVIO_MS
    )
  } catch (e) {
    log.warn('NOTIFICACION_ENVIO_ERR', { id: reg.id, err: e?.message })
    await repo.marcarFallida(reg.id, e?.message || 'error desconocido')
    return { estado: 'fallida', detalle: e?.message }
  }

  if (resultado && resultado.estado === 'exito') {
    await repo.marcarEnviada(reg.id)
    return { estado: 'enviada', messageId: resultado.messageId }
  }

  var error = resultado?.detalle || resultado?.estado || 'envio no disponible'
  await repo.marcarFallida(reg.id, error)
  log.warn('NOTIFICACION_NO_ENVIADA', { id: reg.id, estado: resultado?.estado })
  return { estado: 'fallida', detalle: error }
}

// Registra cada correo de un lote (p.ej. cliente y abogado), lo intenta y aplica
// su estado. Se lanza fire-and-forget desde el llamador de la cita.
export function enviarNotificacionesCita(idCita, lista) {
  var tarea = (async () => {
    if (!Array.isArray(lista) || lista.length === 0) return []
    var resumen = []
    for (var n of lista) {
      try {
        var reg = await repo.crear({
          idCita,
          tipo: n.tipo,
          destinatario: n.destinatario,
          asunto: n.asunto,
          titulo: n.titulo,
          lineas: n.lineas,
        })
        var r = await enviarRegistro(reg)
        resumen.push({ tipo: n.tipo, estado: r.estado })
      } catch (e) {
        log.error('NOTIFICACION_REGISTRAR_ERR', { idCita, err: e?.message })
        resumen.push({ tipo: n.tipo, estado: 'fallida' })
      }
    }
    return resumen
  })()
  pendientes.add(tarea)
  return tarea
}

// Espera a que terminen los envios "fire-and-forget iniciados hasta ahora.
// Usado por las pruebas para dejar la base quieta antes de reconstruirla.
export async function esperarNotificacionesPendientes() {
  if (pendientes.size === 0) return
  var lote = Array.from(pendientes)
  pendientes.clear()
  await Promise.allSettled(lote)
}

// Reprocesa pendientes/fallidas con reintentos disponibles (reprocesamiento).
export async function reprocesarNotificacionesFallidas({ limite = 20 } = {}) {
  var reprocesables = await repo.listarReprocesables({ limite })
  var resultado = { procesadas: 0, enviadas: 0, fallidas: 0 }
  for (var reg of reprocesables) {
    if (reg.intentos >= INTENTOS_MAX) continue
    resultado.procesadas++
    try {
      var r = await enviarRegistro(reg)
      if (r.estado === 'enviada') resultado.enviadas++
      else resultado.fallidas++
    } catch (e) {
      log.error('NOTIFICACION_REPROCESO_ERR', { id: reg.id, err: e?.message })
      resultado.fallidas++
    }
  }
  return resultado
}

export function iniciarScheduler() {
  var enPruebas = process.env.NODE_ENV === 'test' || process.env.VITEST
  if (enPruebas) return null

  reprocesarNotificacionesFallidas().catch((e) => {
    log.error('NOTIFICACIONES_JOB_ERR', { err: e?.message })
  })

  return setInterval(() => {
    reprocesarNotificacionesFallidas().catch((e) => {
      log.error('NOTIFICACIONES_JOB_ERR', { err: e?.message })
    })
  }, INTERVALO_MS)
}