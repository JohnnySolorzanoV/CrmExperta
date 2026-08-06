import * as calRepo from './calendario.repositorio.js'
import { Calendario as Cal } from '../../entidades/calendario.js'
import { ejecutarConsulta } from '../../config/database.js'
import { normalizarFechaIsoUTC, partesEnUtc } from '../../config/datetime.js'
import { HORAS_ATENCION_UTC } from '../../config/horarioInstitucional.js'

var HORAS_ATENCION = HORAS_ATENCION_UTC

function normalizarSlotFecha(slot) {
  return {
    ...slot,
    fechaEvento: normalizarFechaIsoUTC(slot.fechaEvento),
  }
}

function toUtcHourKey(value) {
  var iso = normalizarFechaIsoUTC(value)
  if (!iso) return null
  return iso.slice(0, 13) + ':00:00.000Z'
}

function esHorarioAtencion(fechaIso) {
  var partes = partesEnUtc(fechaIso)
  if (!partes || partes.dia == null || partes.hora == null) return false
  var dia = partes.dia // 0 domingo, 6 sabado
  var hora = partes.hora
  return dia >= 1 && dia <= 5 && HORAS_ATENCION.includes(hora)
}

export var listarSlots = async (idUsuario) => {
  var r = await ejecutarConsulta(
    'SELECT id FROM Abogado WHERE id_usuario = $1 OR id = $1 ORDER BY (id_usuario = $1) DESC LIMIT 1',
    [idUsuario]
  )
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var slots = await calRepo.obtenerPorAbogado(r.rows[0].id)
  return slots.map(normalizarSlotFecha)
}

export var listarDisponibilidadAbogado = async (idUsuario) => {
  var r = await ejecutarConsulta(
    'SELECT id FROM Abogado WHERE id_usuario = $1 OR id = $1 ORDER BY (id_usuario = $1) DESC LIMIT 1',
    [idUsuario]
  )
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var pkAbogado = r.rows[0].id

  // Disponibilidad pública: nunca se expone la descripción (puede contener
  // información confidencial). Solo se devuelve id y fecha del slot.
  var disponiblesCalendario = await ejecutarConsulta(
    `SELECT cal.id, cal.fecha_evento as "fechaEvento"
     FROM Calendario cal
     LEFT JOIN Cita c
       ON c.id_calendario = cal.id
      AND c.estado_cita NOT IN ('cancelada', 'rechazada')
     WHERE cal.id_abogado = $1
       AND cal.fecha_evento >= NOW()
       AND EXTRACT(ISODOW FROM cal.fecha_evento) BETWEEN 1 AND 5
       AND EXTRACT(HOUR FROM cal.fecha_evento) = ANY($2::int[])
       AND c.id IS NULL
     ORDER BY cal.fecha_evento
     LIMIT 20`,
    [pkAbogado, HORAS_ATENCION]
  )

  var filtradosCalendario = disponiblesCalendario.rows
    .map(normalizarSlotFecha)
    .filter(slot => esHorarioAtencion(slot.fechaEvento))
    .slice(0, 20)
  if (filtradosCalendario.length >= 20) return filtradosCalendario

  // Fallback: generar siguientes 20 horarios disponibles aunque no existan slots en Calendario.
  var ocupadas = await ejecutarConsulta(
    `SELECT fecha_hora_copia as "fechaHora"
     FROM Cita
     WHERE id_abogado = $1
       AND estado_cita NOT IN ('cancelada', 'rechazada')
       AND fecha_hora_copia >= NOW()`,
    [pkAbogado]
  )

  var ocupadasSet = new Set(
    ocupadas.rows.map(row => toUtcHourKey(row.fechaHora)).filter(Boolean)
  )
  var existentesSet = new Set(
    filtradosCalendario.map(slot => toUtcHourKey(slot.fechaEvento)).filter(Boolean)
  )

  var resultados = []
  var cursor = new Date()
  cursor.setUTCMinutes(0, 0, 0)
  cursor.setUTCHours(cursor.getUTCHours() + 1)

  // Buscar disponibilidad de forma acotada (hasta 60 dias).
  var iteraciones = 0
  var maxIteraciones = 24 * 60
  while (filtradosCalendario.length + resultados.length < 20 && iteraciones < maxIteraciones) {
    var partes = partesEnUtc(cursor.toISOString())
    var esLaboral = partes && partes.dia >= 1 && partes.dia <= 5 && HORAS_ATENCION.includes(partes.hora)
    var fechaUtcIso = cursor.toISOString()
    var fechaUtcKey = toUtcHourKey(fechaUtcIso)

    if (
      esLaboral &&
      fechaUtcIso &&
      fechaUtcKey &&
      !ocupadasSet.has(fechaUtcKey) &&
      !existentesSet.has(fechaUtcKey)
    ) {
      resultados.push({
        id: null,
        fechaEvento: fechaUtcIso
      })
    }

    cursor.setUTCHours(cursor.getUTCHours() + 1)
    iteraciones += 1
  }

  return [...filtradosCalendario, ...resultados].slice(0, 20)
}

export async function crearSlot({ idAbogado, fechaEvento, descripcion }) {
  if (!idAbogado || !fechaEvento) {
    throw Object.assign(new Error('Faltan datos del slot'), { status: 400 })
  }

  var fechaEventoCanonica = normalizarFechaIsoUTC(fechaEvento)
  if (!fechaEventoCanonica) {
    throw Object.assign(new Error('La fecha del slot no tiene un formato valido.'), { status: 400 })
  }

  var r = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1 OR id = $1 ORDER BY (id_usuario = $1) DESC LIMIT 1', [idAbogado])
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var pkAbogado = r.rows[0].id

  var SLOT = new Cal({
    idAbogado: pkAbogado,
    fechaEvento: fechaEventoCanonica,
    descripcion: descripcion || ''
  })

  var creado = await calRepo.crear(SLOT)
  return normalizarSlotFecha(creado)
}

// Verifica la pertenencia de un slot a un abogado (por id de usuario).
async function slotPerteneceA(id, idUsuarioAbogado) {
  var r = await ejecutarConsulta(
    `SELECT cal.id
     FROM Calendario cal
     JOIN Abogado ab ON ab.id = cal.id_abogado
     WHERE cal.id = $1 AND ab.id_usuario = $2`,
    [id, idUsuarioAbogado]
  )
  return r.rows.length > 0
}

export var obtenerSlot = async (id) => {
  var r = await calRepo.buscarPorId(id)
  if (!r) throw Object.assign(new Error('Slot no encontrado'), { status: 404 })
  return normalizarSlotFecha(r)
}

export var eliminarSlot = async (id, idUsuarioAbogado = null) => {
  if (idUsuarioAbogado != null) {
    if (!(await slotPerteneceA(id, idUsuarioAbogado))) {
      throw Object.assign(new Error('No tienes acceso a este horario'), { status: 403 })
    }
  }
  var r = await calRepo.eliminar(id)
  if (!r) throw Object.assign(new Error('Slot no encontrado'), { status: 404 })
  return { mensaje: 'Slot eliminado' }
}
