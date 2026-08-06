/**
 * Shared calendar grid utilities.
 * El negocio se modela en UTC pero la visualización usa America/Guayaquil
 * (UTC-5, fijo). Todo el día/hora del grid se calcula con componentes de
 * Guayaquil, de modo que el resultado no dependa de la zona del navegador.
 */
import {
  parseServerDate,
  toIsoUtc,
  enGuayaquil,
  partesEnGuayaquil,
  isSameGyeDay,
  startOfGyeDay,
  HORAS_ATENCION_GYE,
  formatearEnGuayaquil,
} from './datetime'

const DIA_MS = 24 * 3600 * 1000

/** Devuelve el lunes (00:00 Guayaquil) de la semana que contiene `date`. */
function getWeekStart(date) {
  const d = startOfGyeDay(date)
  if (!d) return null
  const day = partesEnGuayaquil(d).day // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  return new Date(d.getTime() + diff * DIA_MS)
}

/** Devuelve un array de 7 Date (Lun–Dom) para la semana de `referenceDate`, en Guayaquil. */
export function getWeekDays(referenceDate) {
  const monday = getWeekStart(referenceDate)
  if (!monday) return []
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DIA_MS))
}

/** Devuelve un array de enteros: [startHour, ..., endHour - 1]. */
export function getHourSlots(startHour = 8, endHour = 19) {
  return Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
}

/**
 * Devuelve los ítems de `items` cuyo `_datetime` cae en `day` (día de Guayaquil)
 * a la hora `hour`. Todos los ítems deben tener `_datetime` tras pasar por
 * mapSlotsToCalendarItems o mapCitasToCalendarItems.
 */
export function getItemsForCell(items, day, hour) {
  return items.filter((item) => {
    const partes = partesEnGuayaquil(item._datetime)
    if (!partes) return false
    return isSameGyeDay(item._datetime, day) && partes.hour === hour
  })
}

/** Devuelve true si `date` (día de Guayaquil) es hoy. */
export function isToday(date) {
  return isSameGyeDay(new Date(), date)
}

/** Devuelve un Date desplazado `direction` semanas en el espacio de Guayaquil. */
export function navegarSemana(referenceDate, direction) {
  const d = startOfGyeDay(referenceDate)
  if (!d) return referenceDate
  return new Date(d.getTime() + direction * 7 * DIA_MS)
}

/** Encabezado corto: "lun 23/06". Formatea en America/Guayaquil. */
export function formatDayHeader(date) {
  return formatearEnGuayaquil(date, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }) || ''
}

/** Etiqueta de hora: "08:00". */
export function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

/**
 * Mapea los slots de disponibilidad (GET /api/calendario/abogado/:id/disponibilidad)
 * a items de calendario normalizados. Filtra por horario institucional en Guayaquil.
 */
export function mapSlotsToCalendarItems(slots) {
  return (slots || [])
    .filter((slot) => {
      const p = partesEnGuayaquil(slot.fechaEvento)
      if (!p) return false
      const esDiaLaboral = p.day >= 1 && p.day <= 5
      return esDiaLaboral && HORAS_ATENCION_GYE.has(p.hour)
    })
    .map((slot) => ({
      id: slot.id != null ? slot.id : slot.fechaEvento,
      _datetime: toIsoUtc(slot.fechaEvento) || slot.fechaEvento,
      label:
        formatearEnGuayaquil(slot.fechaEvento, { hour: '2-digit', minute: '2-digit' }) ||
        'Sin hora',
      descripcion: slot.descripcion || '',
      type: 'slot',
    }))
}

/**
 * Mapea las citas (GET /api/citas/abogado/:id o /api/citas/cliente/:id)
 * a items de calendario.
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

/** Sufijo de clase CSS para cada estado de cita. */
export const STATUS_CLASS = {
  pendiente: 'warning',
  confirmada: 'success',
  cancelada: 'danger',
  completada: 'info',
  reprogramada: 'secondary',
  rechazada: 'secondary',
}