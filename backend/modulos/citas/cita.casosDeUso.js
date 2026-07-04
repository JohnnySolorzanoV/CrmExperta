import * as ctaRepo from './cita.repositorio.js'
import { Cita } from '../../entidades/cita.js'
import { ejecutarConsulta } from '../../config/database.js'
import { enviarEmail } from '../../config/google.js'

// ─── Notification helpers ────────────────────────────────────────────────────

function formatearFechaLegible(fecha) {
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(fecha))
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
  if (!emails) return
  var fecha = formatearFechaLegible(cita.fechaHoraCopia)

  await Promise.all([
    enviarEmail({
      para: emails.correo_cliente,
      asunto: 'Tu cita ha sido agendada',
      titulo: 'Cita agendada correctamente',
      lineas: [
        `Hola <strong>${emails.nombre_cliente}</strong>,`,
        `Tu cita con <strong>${emails.nombre_abogado}</strong> ha sido agendada para el <strong>${fecha}</strong>.`,
        `<strong>Motivo:</strong> ${motivo || 'No especificado'}`,
        'La cita está pendiente de confirmación por el abogado. Recibirás un correo cuando sea confirmada.',
        'Si tienes un calendario de Google, encontrarás una invitación en tu bandeja de entrada.',
      ],
    }),
    enviarEmail({
      para: emails.correo_abogado,
      asunto: 'Nueva cita pendiente de confirmación',
      titulo: 'Nueva solicitud de cita',
      lineas: [
        `El cliente <strong>${emails.nombre_cliente}</strong> ha solicitado una cita para el <strong>${fecha}</strong>.`,
        `<strong>Motivo:</strong> ${motivo || 'No especificado'}`,
        'Ingresa al sistema para confirmar o gestionar la cita.',
      ],
    }),
  ])
}

async function notificarConfirmacion(cita) {
  var emails = await obtenerEmailsCita(cita.idCliente, cita.idAbogado)
  if (!emails) return
  var fecha = formatearFechaLegible(cita.fechaHoraCopia)

  await enviarEmail({
    para: emails.correo_cliente,
    asunto: 'Tu cita ha sido confirmada',
    titulo: 'Cita confirmada',
    lineas: [
      `Hola <strong>${emails.nombre_cliente}</strong>,`,
      `Tu cita con <strong>${emails.nombre_abogado}</strong> el <strong>${fecha}</strong> ha sido confirmada.`,
      'Recuerda presentarte a tiempo. Si necesitas cancelar, comunícate con anticipación.',
    ],
  })
}

async function notificarReprogramacion(citaActualizada, nuevaFecha) {
  var emails = await obtenerEmailsCita(citaActualizada.idCliente, citaActualizada.idAbogado)
  if (!emails) return
  var fecha = formatearFechaLegible(nuevaFecha)

  await Promise.all([
    enviarEmail({
      para: emails.correo_cliente,
      asunto: 'Tu cita ha sido reprogramada',
      titulo: 'Cita reprogramada',
      lineas: [
        `Hola <strong>${emails.nombre_cliente}</strong>,`,
        `Tu cita con <strong>${emails.nombre_abogado}</strong> ha sido reprogramada para el <strong>${fecha}</strong>.`,
        'Si tienes alguna duda, comunícate con nosotros.',
      ],
    }),
    enviarEmail({
      para: emails.correo_abogado,
      asunto: 'Cita reprogramada',
      titulo: 'Cita reprogramada',
      lineas: [
        `La cita con <strong>${emails.nombre_cliente}</strong> ha sido reprogramada para el <strong>${fecha}</strong>.`,
        'Ingresa al sistema para ver los detalles actualizados.',
      ],
    }),
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

  await Promise.all([
    enviarEmail({
      para: emails.correo_cliente,
      asunto: 'Tu cita ha sido cancelada',
      titulo: 'Cita cancelada',
      lineas: [
        `Hola <strong>${emails.nombre_cliente}</strong>,`,
        `Tu cita con <strong>${emails.nombre_abogado}</strong> del <strong>${fecha}</strong> ha sido cancelada por ${quien}.`,
        razon,
        'Si deseas reagendar, puedes hacerlo desde nuestra plataforma.',
      ],
    }),
    enviarEmail({
      para: emails.correo_abogado,
      asunto: 'Cita cancelada',
      titulo: 'Cita cancelada',
      lineas: [
        `La cita con <strong>${emails.nombre_cliente}</strong> del <strong>${fecha}</strong> ha sido cancelada por ${quien}.`,
        razon,
      ],
    }),
  ])
}

// ─── Use cases ───────────────────────────────────────────────────────────────

export async function listarCitas() {
  return ctaRepo.obtenerTodas()
}

export var obtenerCita = async (id) => {
  var c = await ctaRepo.buscarPorId(id)
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return c
}

export var listarCitasCliente = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  return ctaRepo.buscarPorCliente(r.rows[0].id)
}

export var listarCitasAbogado = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return ctaRepo.buscarPorAbogado(r.rows[0].id)
}

export async function agendarCita({ idCliente, idAbogado, fechaHoraCopia, idCalendario, motivo, resumenChatbot }) {
  if (!idCliente || !fechaHoraCopia) {
    throw Object.assign(new Error('Faltan datos requeridos para la cita'), { status: 400 })
  }

  if (!idAbogado) {
    throw Object.assign(new Error('Debes asignar un abogado para crear la cita'), { status: 400 })
  }

  var rCliente = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idCliente])
  if (rCliente.rows.length === 0) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  var pkCliente = rCliente.rows[0].id

  var rAbogado = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idAbogado])
  if (rAbogado.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var pkAbogado = rAbogado.rows[0].id

  var conflictoHora = await ctaRepo.existeConflictoAbogado(pkAbogado, fechaHoraCopia)
  if (conflictoHora) throw Object.assign(new Error('Este abogado ya tiene una cita en esa hora'), { status: 409 })

  if (idCalendario) {
    var ocupado = await ctaRepo.slotOcupado(idCalendario)
    if (ocupado) throw Object.assign(new Error('El horario ya esta reservado'), { status: 409 })
  }

  if (!idCalendario) {
    var slotCreado = await ejecutarConsulta(
      `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, $3) RETURNING id`,
      [pkAbogado, fechaHoraCopia, 'Cita agendada: ' + (motivo || '')]
    )
    idCalendario = slotCreado.rows[0].id
  }

  var cita_nueva = new Cita({
    idCliente: pkCliente, idAbogado: pkAbogado, fechaHoraCopia, idCalendario,
    motivo, estadoCita: 'pendiente', resumenChatbot
  })

  var cita = await ctaRepo.crear(cita_nueva)

  // Fire-and-forget: email notifications (does not block the response)
  notificarAgendamiento(cita, pkCliente, pkAbogado, motivo).catch(e => {
    console.error('[Notificaciones] agendarCita id=' + cita.id + ':', e.message)
  })

  return cita
}

/**
 * Cancels a cita, persists the audit fields, and fires email notifications.
 * @param {number} id
 * @param {object} opts
 * @param {string} [opts.motivoCancelacion]
 * @param {string} [opts.canceladoPor] - 'cliente' | 'abogado' | 'administrador'
 */
export var cancelarCita = async (id, { motivoCancelacion, canceladoPor } = {}) => {
  var c = await ctaRepo.cancelarConMotivo(id, motivoCancelacion, canceladoPor)
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })

  notificarCancelacion(c, motivoCancelacion, canceladoPor).catch(e => {
    console.error('[Notificaciones] cancelarCita id=' + id + ':', e.message)
  })

  return c
}

export var completarCita = async (id) => {
  var c = await ctaRepo.actualizarEstado(id, 'completada')
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return c
}

export var aceptarCita = async (id) => {
  var c = await ctaRepo.actualizarEstado(id, 'confirmada')
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })

  notificarConfirmacion(c).catch(e => {
    console.error('[Notificaciones] aceptarCita id=' + id + ':', e.message)
  })

  return c
}

export async function reprogramarCita(id, fechaHoraCopia, idCalendario) {
  var existe = await ctaRepo.buscarPorId(id)
  if (!existe) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })

  var conflictoHora = await ctaRepo.existeConflictoAbogado(existe.idAbogado, fechaHoraCopia, id)
  if (conflictoHora) throw Object.assign(new Error('El abogado ya tiene una cita en ese nuevo horario'), { status: 409 })

  if (idCalendario) {
    var ocupado = await ctaRepo.slotOcupado(idCalendario)
    if (ocupado) throw Object.assign(new Error('El nuevo horario ya esta reservado'), { status: 409 })
  }

  if (!idCalendario) {
    var r = await ejecutarConsulta(
      'SELECT id_abogado FROM Cita WHERE id = $1', [id]
    )
    var pkAbogado = r.rows[0].id_abogado
    var slotCreado = await ejecutarConsulta(
      `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, $3) RETURNING id`,
      [pkAbogado, fechaHoraCopia, 'Cita reprogramada']
    )
    idCalendario = slotCreado.rows[0].id
  }

  var citaActualizada = await ctaRepo.actualizarFecha(id, fechaHoraCopia, idCalendario)

  notificarReprogramacion(citaActualizada, fechaHoraCopia).catch(e => {
    console.error('[Notificaciones] reprogramarCita id=' + id + ':', e.message)
  })

  return citaActualizada
}

export var eliminarCita = async (id) => {
  var r = await ctaRepo.eliminar(id)
  if (!r) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return { mensaje: 'Cita eliminada' }
}
