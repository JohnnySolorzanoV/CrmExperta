function parseAsUtcDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value !== 'string' && typeof value !== 'number') return null
  var raw = String(value).trim()
  if (!raw) return null

  // If timezone info is missing, treat the input as UTC.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(raw)) {
    raw += 'Z'
  }
  // PostgreSQL timestamp text format (without timezone): "YYYY-MM-DD HH:mm:ss(.sss)"
  // Normalize it to ISO UTC to prevent local timezone shifts.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/.test(raw)) {
    raw = raw.replace(' ', 'T') + 'Z'
  }

  var parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function normalizarFechaIsoUTC(value) {
  var parsed = parseAsUtcDate(value)
  if (!parsed) return null
  return parsed.toISOString()
}
