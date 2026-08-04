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

// Ecuador continental no aplica horario de verano (UTC-5 todo el año). Las reglas
// de agenda (dia laborable y hora de atencion) deben calcularse en America/Guayaquil
// para que el comportamiento no dependa de la zona horaria del servidor.
var ZONA_ECUADOR = 'America/Guayaquil'
var MAPA_DIA = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

// Devuelve { dia (0-6, domingo=0), hora (0-23) } en America/Guayaquil.
export function partesEnGuayaquil(value) {
  var parsed = parseAsUtcDate(value)
  if (!parsed) return null
  var formateador = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_ECUADOR,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23'
  })
  var partes = formateador.formatToParts(parsed)
  var campos = {}
  for (var p of partes) campos[p.type] = p.value
  if (campos.weekday == null || campos.hour == null) return null
  return {
    dia: MAPA_DIA[campos.weekday.toLowerCase()] ?? null,
    hora: parseInt(campos.hour, 10)
  }
}
