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
