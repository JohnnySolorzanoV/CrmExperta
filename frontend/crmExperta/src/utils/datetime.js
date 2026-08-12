// Canonical app rule: datetime payloads without timezone are interpreted as UTC.
// El negocio se modela en UTC; la presentación usa America/Guayaquil (UTC-5, sin DST).

export const ZONA_INSTITUCIONAL = 'America/Guayaquil'
export const OFFSET_GUAYAQUIL_UTC_HORAS = 5
const OFFSET_GYE_MS = OFFSET_GUAYAQUIL_UTC_HORAS * 3600 * 1000

// Horas de inicio de slots de atención, en hora de Guayaquil (10-12 y 15-17)
// y su equivalente en UTC (+5). Valores espejo de backend/config/horarioInstitucional.js.
export const HORAS_ATENCION_GYE = new Set([10, 11, 15, 16])
export const HORAS_ATENCION_UTC = new Set([15, 16, 20, 21])

function parseAsUtcDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value !== 'string' && typeof value !== 'number') return null

  let raw = String(value).trim()
  if (!raw) return null

  // Canonical app rule: datetime payloads without timezone are interpreted as UTC.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(raw)) {
    raw += 'Z'
  }

  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function parseServerDate(value) {
  return parseAsUtcDate(value)
}

export function toIsoUtc(value) {
  const d = parseAsUtcDate(value)
  return d ? d.toISOString() : null
}

export function isPastDate(value, nowMs = Date.now()) {
  const d = parseAsUtcDate(value)
  if (!d) return false
  return d.getTime() < nowMs
}

/**
 * Devuelve un Date "desplazado" cuyos getters UTC* equivalen a los componentes
 * locales de America/Guayaquil (offset fijo, sin horario de verano).
 */
export function enGuayaquil(value) {
  const d = parseAsUtcDate(value)
  if (!d) return null
  return new Date(d.getTime() + OFFSET_GYE_MS)
}

/**
 * Componentes de la fecha en America/Guayaquil: { year, month, date, day, hour, minute }.
 * `day` es 0=domingo ... 6=sábado.
 */
export function partesEnGuayaquil(value) {
  const g = enGuayaquil(value)
  if (!g) return null
  return {
    year: g.getUTCFullYear(),
    month: g.getUTCMonth(),
    date: g.getUTCDate(),
    day: g.getUTCDay(),
    hour: g.getUTCHours(),
    minute: g.getUTCMinutes(),
  }
}

export function isSameGyeDay(a, b) {
  const pa = partesEnGuayaquil(a)
  const pb = partesEnGuayaquil(b)
  if (!pa || !pb) return false
  return pa.year === pb.year && pa.month === pb.month && pa.date === pb.date
}

/** Instante correspondiente a la medianoche (00:00) de la fecha de Guayaquil que contiene a `value`. */
export function startOfGyeDay(value) {
  const p = partesEnGuayaquil(value)
  if (!p) return null
  return new Date(Date.UTC(p.year, p.month, p.date) - OFFSET_GYE_MS)
}

/** Formatea un instante en America/Guayaquil con el locale es-EC. */
export function formatearEnGuayaquil(value, opciones = {}) {
  const d = parseAsUtcDate(value)
  if (!d) return null
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: ZONA_INSTITUCIONAL,
    ...opciones,
  }).format(d)
}
