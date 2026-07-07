/**
 * Shared calendar grid utilities.
 * All date work is done in local time to match the browser's locale display.
 */
import { parseServerDate, toIsoUtc } from './datetime'

// Working hours (start hours of 1-hour slots):
//   Mornings   10:00 - 12:00  -> start hours 10, 11
//   Afternoons 15:00 - 17:00  -> start hours 15, 16
const HORAS_ATENCION = new Set([10, 11, 15, 16])

/** Returns the Monday of the week containing `date`. */
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns an array of 7 Date objects (Mon–Sun) for the week containing `referenceDate`. */
export function getWeekDays(referenceDate) {
  const monday = getWeekStart(referenceDate)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/** Returns an array of integer hours: [startHour, ..., endHour - 1]. */
export function getHourSlots(startHour = 8, endHour = 19) {
  return Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Returns items from `items` whose `_datetime` falls on `day` at `hour`.
 * All items must have a `_datetime` string/Date after being mapped through
 * mapSlotsToCalendarItems or mapCitasToCalendarItems.
 */
export function getItemsForCell(items, day, hour) {
  return items.filter((item) => {
    const d = parseServerDate(item._datetime)
    if (!d) return false
    return isSameDay(d, day) && d.getHours() === hour
  })
}

/** Returns true if `date` is today. */
export function isToday(date) {
  return isSameDay(new Date(), date)
}

/** Returns a new Date shifted by `direction` weeks (+1 or -1). */
export function navegarSemana(referenceDate, direction) {
  const d = new Date(referenceDate)
  d.setDate(d.getDate() + direction * 7)
  return d
}

/** Short column header: "lun 23/06". */
export function formatDayHeader(date) {
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

/** Hour label: "08:00". */
export function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

/**
 * Maps the raw availability slots from
 * GET /api/calendario/abogado/:id/disponibilidad
 * into normalised calendar items.
 */
export function mapSlotsToCalendarItems(slots) {
  return (slots || [])
    .filter((slot) => {
      const dt = parseServerDate(slot.fechaEvento)
      if (!dt) return false
      const esDiaLaboral = dt.getDay() >= 1 && dt.getDay() <= 5
      return esDiaLaboral && HORAS_ATENCION.has(dt.getHours())
    })
    .map((slot) => ({
      id: slot.id != null ? slot.id : slot.fechaEvento,
      _datetime: toIsoUtc(slot.fechaEvento) || slot.fechaEvento,
      label: parseServerDate(slot.fechaEvento)?.toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
      }) || 'Sin hora',
      descripcion: slot.descripcion || '',
      type: 'slot',
    }))
}

/**
 * Maps the raw citas from
 * GET /api/citas/abogado/:id  or  GET /api/citas/cliente/:id
 * into normalised calendar items.
 */
export function mapCitasToCalendarItems(citas) {
  return (citas || []).map((cita) => ({
    id: cita.id,
    _datetime: toIsoUtc(cita.fechaHoraCopia) || cita.fechaHoraCopia,
    label: cita.clienteNombre || cita.abogadoNombre || 'Cita',
    status: cita.estadoCita || 'pendiente',
    motivo: cita.motivo || '',
    resumen: cita.resumenChatbot || '',
    type: 'cita',
    _raw: cita,
  }))
}

/** CSS class suffix for each cita status. */
export const STATUS_CLASS = {
  pendiente: 'warning',
  confirmada: 'success',
  cancelada: 'danger',
  completada: 'info',
  reprogramada: 'secondary',
}
