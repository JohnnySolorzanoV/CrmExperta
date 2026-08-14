import * as ctaRepo from './cita.repositorio.js'
import { Cita } from '../../entidades/cita.js'
import { ejecutarConsulta, ejecutarEnTransaccion } from '../../config/database.js'
import { enviarNotificacionesCita } from '../notificacion/notificacion.servicio.js'
import { log } from '../../config/logger.js'
import { registrarAuditoria } from '../auditoria/auditoria.servicio.js'
import { normalizarFechaIsoUTC, partesEnUtc, formatearEnGuayaquil } from '../../config/datetime.js'
import { HORA_INICIO_UTC, HORA_FIN_UTC } from '../../config/horarioInstitucional.js'

// En pruebas de integración las notificaciones se esperan para que las aserciones
// y la recreación del esquema no sufran carreras ni deadlocks. En producción se
// mantiene el comportamiento fire-and-forget (no bloquean la respuesta).
var MODO_PRUEBAS = process.env.NODE_ENV === 'test' || !!process.env.VITEST

async function dispararNotificacion(fabricante, etiqueta, datos) {
  var promesa = fabricante().catch((e) => log.error(etiqueta, { ...datos, err: e.message }))
  if (MODO_PRUEBAS) await promesa
}

// ─── Notification helpers ────────────────────────────────────────────────────

function formatearFechaLegible(fecha) {
  return formatearEnGuayaquil(fecha, {
    weekday: 'long', year: 'numeric', month: 'long',
    day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

/** Fetches client and lawyer names + emails from their internal PKs. */
async function obtenerEmailsCita(pkCliente, pkAbogado) {
  var r = await ejecutarConsulta(
    `SELECT
      uc.correo  AS correo_cliente,  uc.nombre  AS nombre_cliente,
      ua.correo  AS correo_abogado,  ua.nombre  AS nombre_abogado
     FROM Cliente c
     JOIN Usuario uc ON uc.id = c.id_usuario
     CROSS JOIN Abogado ab
     JOIN Usuario ua ON ua.id = ab.id_usuario
     WHERE c.id = $1 AND ab.id = $2`,
    [pkCliente, pkAbogado]
  )
  return r.rows[0] || null
}

async function notificarAgendamiento(cita, pkCliente, pkAbogado, motivo) {
  var emails = await obtenerEmailsCita(pkCliente, pkAbogado)
  console.error('DEBUG_EMAILS', JSON.stringify(emails), 'citaId', cita?.id)
  if (!emails) return
  var fecha = formatearFechaLegible(cita.fechaHoraCopia)

  await enviarNotificacionesCita(cita.id, [
    {
      tipo: 'cita_agendada_cliente',
      destinatario: emails.correo_cliente,
      asunto: 'Tu cita ha sido agendada',
      titulo: 'Cita agendada correctamente',
      lineas: [
        `Hola <strong>${emails.nombre_cliente}</strong>,`,
        `Tu cita con <strong>${emails.nombre_abogado}</strong> ha sido agendada para el <strong>${fecha}</strong>.`,
        `<strong>Motivo:</strong> ${motivo || 'No especificado'}`,
        'La cita está pendiente de confirmación por el abogado. Recibirás un correo cuando sea confirmada.',
        'Si tienes un calendario de Google, encontrarás una invitación en tu bandeja de entrada.',
      ],
    },
    {
      tipo: 'cita_agendada_abogado',
      destinatario: emails.correo_abogado,
      asunto: 'Nueva cita pendiente de confirmación',
      titulo: 'Nueva solicitud de cita',
      lineas: [
        `El cliente <strong>${emails.nombre_cliente}</strong> ha solicitado una cita para el <strong>${fecha}</strong>.`,
        `<strong>Motivo:</strong> ${motivo || 'No especificado'}`,
        'Ingresa al sistema para confirmar o gestionar la cita.',
      ],
    },
  ])
}

async function notificarConfirmacion(cita) {
  var emails = await obtenerEmailsCita(cita.idCliente, cita.idAbogado)
  if (!emails) return
  var fecha = formatearFechaLegible(cita.fechaHoraCopia)

  await enviarNotificacionesCita(cita.id, [
    {
      tipo: 'cita_confirmada_cliente',
      destinatario: emails.correo_cliente,
      asunto: 'Tu cita ha sido confirmada',
      titulo: 'Cita confirmada',
      lineas: [
        `Hola <strong>${emails.nombre_cliente}</strong>,`,
        `Tu cita con <strong>${emails.nombre_abogado}</strong> el <strong>${fecha}</strong> ha sido confirmada.`,
        'Recuerda presentarte a tiempo. Si necesitas cancelar, comunícate con anticipación.',
      ],
    },
  ])
}

async function notificarReprogramacion(citaActualizada, nuevaFecha) {
  var emails = await obtenerEmailsCita(citaActualizada.idCliente, citaActualizada.idAbogado)
  if (!emails) return
  var fecha = formatearFechaLegible(nuevaFecha)

  await enviarNotificacionesCita(citaActualizada.id, [
    {
      tipo: 'cita_reprogramada_cliente',
      destinatario: emails.correo_cliente,
      asunto: 'Tu cita ha sido reprogramada',
      titulo: 'Cita reprogramada',
      lineas: [
        `Hola <strong>${emails.nombre_cliente}</strong>,`,
        `Tu cita con <strong>${emails.nombre_abogado}</strong> ha sido reprogramada para el <strong>${fecha}</strong>.`,
        'Si tienes alguna duda, comunícate con nosotros.',
      ],
    },
    {
      tipo: 'cita_reprogramada_abogado',
      destinatario: emails.correo_abogado,
      asunto: 'Cita reprogramada',
      titulo: 'Cita reprogramada',
      lineas: [
        `La cita con <strong>${emails.nombre_cliente}</strong> ha sido reprogramada para el <strong>${fecha}</strong>.`,
        'Ingresa al sistema para ver los detalles actualizados.',
      ],
    },
  ])
}

async function notificarCancelacion(cita, motivoCancelacion, canceladoPor) {
  var emails = await obtenerEmailsCita(cita.idCliente, cita.idAbogado)
  if (!emails) return
  var fecha = formatearFechaLegible(cita.fechaHoraCopia)
  var quien = canceladoPor === 'cliente' ? 'el cliente'
    : canceladoPor === 'abogado' ? 'el abogado'
    : 'el sistema'
  var razon = motivoCancelacion ? `<strong>Motivo:</strong> ${motivoCancelacion}` : ''

  await enviarNotificacionesCita(cita.id, [
    {
      tipo: 'cita_cancelada_cliente',
      destinatario: emails.correo_cliente,
      asunto: 'Tu cita ha sido cancelada',
      titulo: 'Cita cancelada',
      lineas: [
        `Hola <strong>${emails.nombre_cliente}</strong>,`,
        `Tu cita con <strong>${emails.nombre_abogado}</strong> del <strong>${fecha}</strong> ha sido cancelada por ${quien}.`,
        razon,
        'Si deseas reagendar, puedes hacerlo desde nuestra plataforma.',
      ],
    },
    {
      tipo: 'cita_cancelada_abogado',
      destinatario: emails.correo_abogado,
      asunto: 'Cita cancelada',
      titulo: 'Cita cancelada',
      lineas: [
        `La cita con <strong>${emails.nombre_cliente}</strong> del <strong>${fecha}</strong> ha sido cancelada por ${quien}.`,
        razon,
      ],
    },
  ])
}

// ─── Use cases ───────────────────────────────────────────────────────────────

// Valida la consistencia entre la cita y su horario antes de persistir: el slot
// debe existir, pertenecer al abogado de la cita y coincidir su fecha con la de
// la cita. También rechaza horarios ya reservados. Usa la transacción recibida
// (`cnn`) para validar y guardar de forma atómica. Retorna/status 400 (inexistente
// o fecha distinta), 403 (ajeno) o 409 (ocupado).
async function validarSlotParaCita(idCalendario, pkAbogado, fechaCanonica, excluirCitaId = null, cnn = null) {
  var q = cnn ? (txt, prms) => cnn.query(txt, prms) : ejecutarConsulta
  var r = await q(
    `SELECT cal.id_abogado AS "idAbogado", cal.fecha_evento AS "fechaEvento"
     FROM Calendario cal WHERE cal.id = $1`,
    [idCalendario]
  )
  if (r.rows.length === 0) {
    throw Object.assign(new Error('El horario no existe'), { status: 400 })
  }
  var slot = r.rows[0]
  if (Number(slot.idAbogado) !== Number(pkAbogado)) {
    throw Object.assign(new Error('El horario no pertenece al abogado'), { status: 403 })
  }
  var fechaSlot = normalizarFechaIsoUTC(slot.fechaEvento)
  if (!fechaSlot || fechaSlot !== fechaCanonica) {
    throw Object.assign(new Error('La fecha del horario no coincide con la fecha de la cita'), { status: 400 })
  }
  var ocupado = await ctaRepo.slotOcupado(idCalendario, excluirCitaId, cnn)
  if (ocupado) throw Object.assign(new Error('El horario ya esta reservado'), { status: 409 })
}

// Detecta un conflicto por reserva simultánea: la restricción única de Postgres
// (uidx_cita_abogado_hora_activa) garantiza que dos inserciones concurrentes al
// mismo horario generen una única reserva y un rechazo controlado (23505).
function esConflictoHorario(e) {
  return e?.code === '23505'
}

function rechazoConflicto() {
  return Object.assign(new Error('Este abogado ya tiene una cita en esa hora'), { status: 409 })
}

// Validación de franja horaria (RF05): evita fechas pasadas, fines de semana y
// horarios fuera de atención. Los datos se guardan en UTC, por lo que la ventana
// se evalúa con componentes UTC (HORA_INICIO_UTC .. HORA_FIN_UTC).
function validarFranjaAtencion(fechaIso) {
  var d = new Date(fechaIso)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
    throw Object.assign(new Error('La fecha de la cita no puede estar en el pasado'), { status: 400 })
  }
  var partes = partesEnUtc(fechaIso)
  if (!partes || partes.dia == null || partes.hora == null) {
    throw Object.assign(new Error('La fecha de la cita no tiene un formato valido.'), { status: 400 })
  }
  if (partes.dia === 0 || partes.dia === 6) {
    throw Object.assign(new Error('No se pueden agendar citas en fines de semana'), { status: 400 })
  }
  if (partes.hora < HORA_INICIO_UTC || partes.hora >= HORA_FIN_UTC) {
    throw Object.assign(new Error('La hora esta fuera del horario de atencion (10:00 - 17:00)'), { status: 400 })
  }
}

export async function listarCitas() {
  return ctaRepo.obtenerTodas()
}

export var obtenerCita = async (id) => {
  var c = await ctaRepo.buscarPorId(id)
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return c
}

export var listarCitasCliente = async (idUsuario) => {
  var r = await ejecutarConsulta(
    'SELECT id FROM Cliente WHERE id_usuario = $1 OR id = $1 ORDER BY (id_usuario = $1) DESC LIMIT 1',
    [idUsuario]
  )
  if (r.rows.length === 0) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  return ctaRepo.buscarPorCliente(r.rows[0].id)
}

export var listarCitasAbogado = async (idUsuario) => {
  var r = await ejecutarConsulta(
    'SELECT id FROM Abogado WHERE id_usuario = $1 OR id = $1 ORDER BY (id_usuario = $1) DESC LIMIT 1',
    [idUsuario]
  )
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return ctaRepo.buscarPorAbogado(r.rows[0].id)
}

export async function agendarCita({ idCliente, idAbogado, fechaHoraCopia, idCalendario, motivo, resumenChatbot }, auditoria = null) {
  if (!idCliente || !fechaHoraCopia) {
    throw Object.assign(new Error('Faltan datos requeridos para la cita'), { status: 400 })
  }

  if (!idAbogado) {
    throw Object.assign(new Error('Debes asignar un abogado para crear la cita'), { status: 400 })
  }

  var fechaCanonica = normalizarFechaIsoUTC(fechaHoraCopia)
  if (!fechaCanonica) {
    throw Object.assign(new Error('La fecha de la cita no tiene un formato valido.'), { status: 400 })
  }
  validarFranjaAtencion(fechaCanonica)

  var rCliente = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idCliente])
  if (rCliente.rows.length === 0) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  var pkCliente = rCliente.rows[0].id

  var rAbogado = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idAbogado])
  if (rAbogado.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var pkAbogado = rAbogado.rows[0].id

  // La validación (conflicto horario, propietario del slot, fecha del slot,
  // disponibilidad) y el registro (slot + cita) se ejecutan en una sola
  // transacción: si algo falla no quedan citas ni horarios parciales.
  var cita = await ejecutarEnTransaccion(async (cnn) => {
    var conflictoHora = await ctaRepo.existeConflictoAbogado(pkAbogado, fechaCanonica, null, cnn)
    if (conflictoHora) throw Object.assign(new Error('Este abogado ya tiene una cita en esa hora'), { status: 409 })

    if (idCalendario) {
      await validarSlotParaCita(idCalendario, pkAbogado, fechaCanonica, null, cnn)
    } else {
      // El motivo (y cualquier descripción confidencial) jamás se guarda en el
      // calendario público: la descripción del slot queda vacía.
      var slotCreado = await cnn.query(
        `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, NULL) RETURNING id`,
        [pkAbogado, fechaCanonica]
      )
      idCalendario = slotCreado.rows[0].id
    }

    var cita_nueva = new Cita({
      idCliente: pkCliente, idAbogado: pkAbogado, fechaHoraCopia: fechaCanonica, idCalendario,
      motivo, estadoCita: 'pendiente', resumenChatbot
    })

    try {
      var cita_guardada = await ctaRepo.crear(cita_nueva, cnn)
      // Auditoría en la misma transacción: si el log falla, la cita se revierte.
      if (auditoria) {
        await registrarAuditoria({
          req: auditoria.req,
          accion: auditoria.accion,
          recurso: auditoria.recurso,
          recursoId: cita_guardada.id,
          detalle: auditoria.detalle,
          cnn,
        })
      }
      return cita_guardada
    } catch (e) {
      if (esConflictoHorario(e)) throw rechazoConflicto()
      throw e
    }
  })

  log.info('CITA_AGENDADA', { citaId: cita.id, abogado: pkAbogado, fecha: fechaCanonica })

  // Fire-and-forget: email notifications (does not block the response)
  await dispararNotificacion(() => notificarAgendamiento(cita, pkCliente, pkAbogado, motivo), 'NOTIFICACION_AGENDAR_ERR', { citaId: cita.id })

  return cita
}

/**
 * Cancels a cita, persists the audit fields, and fires email notifications.
 * @param {number} id
 * @param {object} opts
 * @param {string} [opts.motivoCancelacion]
 * @param {string} [opts.canceladoPor] - 'cliente' | 'abogado' | 'administrador'
 */
export var cancelarCita = async (id, { motivoCancelacion, canceladoPor, cnn = null } = {}) => {
  var previa = await ctaRepo.buscarPorId(id)
  if (!previa) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  if (previa.estadoCita === 'completada' || previa.estadoCita === 'cancelada' || previa.estadoCita === 'rechazada') {
    throw Object.assign(new Error('Esta cita ya no se puede cancelar'), { status: 409 })
  }
  var c = await ctaRepo.cancelarConMotivo(id, motivoCancelacion, canceladoPor, cnn)

  log.info('CITA_CANCELADA', { citaId: id, motivo: motivoCancelacion, por: canceladoPor })

  await dispararNotificacion(() => notificarCancelacion(c, motivoCancelacion, canceladoPor), 'NOTIFICACION_CANCELAR_ERR', { citaId: id })

  return c
}

export var completarCita = async (id, cnn = null) => {
  var previa = await ctaRepo.buscarPorId(id)
  if (!previa) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  if (previa.estadoCita !== 'confirmada') {
    throw Object.assign(new Error('Solo se puede completar una cita confirmada'), { status: 409 })
  }
  var c = await ctaRepo.actualizarEstado(id, 'completada', cnn)
  return c
}

export var aceptarCita = async (id, cnn = null) => {
  var previa = await ctaRepo.buscarPorId(id)
  if (!previa) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  if (previa.estadoCita !== 'pendiente' && previa.estadoCita !== 'reprogramada') {
    throw Object.assign(new Error('Solo se puede aceptar una cita pendiente o reprogramada'), { status: 409 })
  }
  var c = await ctaRepo.actualizarEstado(id, 'confirmada', cnn)

  await dispararNotificacion(() => notificarConfirmacion(c), 'NOTIFICACION_ACEPTAR_ERR', { citaId: id })

  return c
}

export var rechazarCita = async (id, cnn = null) => {
  var previa = await ctaRepo.buscarPorId(id)
  if (!previa) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  if (previa.estadoCita !== 'pendiente' && previa.estadoCita !== 'reprogramada') {
    throw Object.assign(new Error('Solo se puede rechazar una cita pendiente o reprogramada'), { status: 409 })
  }
  return ctaRepo.actualizarEstado(id, 'rechazada', cnn)
}

export async function reprogramarCita(id, fechaHoraCopia, idCalendario, auditoria = null) {
  var existe = await ctaRepo.buscarPorId(id)
  if (!existe) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })

  if (existe.estadoCita === 'completada' || existe.estadoCita === 'cancelada' || existe.estadoCita === 'rechazada') {
    throw Object.assign(new Error('Una cita completada, cancelada o rechazada no se puede reprogramar'), { status: 409 })
  }

  var fechaCanonica = normalizarFechaIsoUTC(fechaHoraCopia)
  if (!fechaCanonica) {
    throw Object.assign(new Error('La nueva fecha de la cita no tiene un formato valido.'), { status: 400 })
  }
  validarFranjaAtencion(fechaCanonica)

  // Validación y registro en una sola transacción: no quedan citas ni horarios
  // parciales si algo falla.
  var citaActualizada = await ejecutarEnTransaccion(async (cnn) => {
    var conflictoHora = await ctaRepo.existeConflictoAbogado(existe.idAbogado, fechaCanonica, id, cnn)
    if (conflictoHora) throw Object.assign(new Error('El abogado ya tiene una cita en ese nuevo horario'), { status: 409 })

    var idCalendarioFinal = idCalendario
    if (idCalendario) {
      await validarSlotParaCita(idCalendario, existe.idAbogado, fechaCanonica, id, cnn)
    } else {
      var r = await cnn.query('SELECT id_abogado FROM Cita WHERE id = $1', [id])
      var pkAbogado = r.rows[0].id_abogado
      var slotCreado = await cnn.query(
        `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, NULL) RETURNING id`,
        [pkAbogado, fechaCanonica]
      )
      idCalendarioFinal = slotCreado.rows[0].id
    }

    var actualizada
    try {
      actualizada = await ctaRepo.actualizarFecha(id, fechaCanonica, idCalendarioFinal, cnn)
    } catch (e) {
      if (esConflictoHorario(e)) throw rechazoConflicto()
      throw e
    }

    // Auditoría en la misma transacción: si el log falla, se revierte la reprogramación.
    if (auditoria) {
      await registrarAuditoria({
        req: auditoria.req,
        accion: auditoria.accion,
        recurso: auditoria.recurso,
        recursoId: id,
        detalle: `reprogramacion: ${existe.fechaHoraCopia} -> ${actualizada.fechaHoraCopia}`,
        cnn,
      })
    }
    return actualizada
  })

  log.info('CITA_REPROGRAMADA', { citaId: id, desde: existe.fechaHoraCopia, hacia: fechaCanonica })

  await dispararNotificacion(() => notificarReprogramacion(citaActualizada, fechaCanonica), 'NOTIFICACION_REPROGRAMAR_ERR', { citaId: id })

  return citaActualizada
}

export var eliminarCita = async (id) => {
  var r = await ctaRepo.eliminar(id)
  if (!r) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return { mensaje: 'Cita eliminada' }
}
