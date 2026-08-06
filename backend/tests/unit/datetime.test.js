import { describe, expect, it } from 'vitest'
import {
  normalizarFechaIsoUTC,
  partesEnGuayaquil,
  partesEnUtc,
  formatearEnGuayaquil,
} from '../../config/datetime.js'

describe('datetime.partesEnGuayaquil (RFC zona horaria Ecuador)', () => {
  it('UNIT-DATETIME-01 convierte una fecha UTC a dia/hora de America/Guayaquil (UTC-5)', () => {
    var partes = partesEnGuayaquil('2026-01-05T15:00:00.000Z')
    expect(partes).toEqual({ dia: 1, hora: 10 })
  })

  it('UNIT-DATETIME-02 el dia puede cambiar respecto a UTC al cruzar la medianoche local', () => {
    // 2026-01-06 04:30Z todavia es lunes 23:30 en Guayaquil.
    var partes = partesEnGuayaquil('2026-01-06T04:30:00.000Z')
    expect(partes).toEqual({ dia: 1, hora: 23 })
  })

  it('UNIT-DATETIME-03 identifica el fin de semana en la zona local', () => {
    // 2026-01-10 (sabado) 15:00Z -> sabado 10:00 en Guayaquil.
    var partes = partesEnGuayaquil('2026-01-10T15:00:00.000Z')
    expect(partes.dia).toBe(6)
  })

  it('UNIT-DATETIME-04 devuelve null para fechas invalidas o vacias', () => {
    expect(partesEnGuayaquil(null)).toBeNull()
    expect(partesEnGuayaquil('')).toBeNull()
    expect(partesEnGuayaquil('no-es-fecha')).toBeNull()
    expect(partesEnGuayaquil(undefined)).toBeNull()
  })
})

describe('datetime.partesEnUtc (validacion en UTC, independiente del runner)', () => {
  it('UNIT-DATETIME-05 lee dia y hora en UTC', () => {
    // 2026-01-05 (lunes) 16:00Z
    expect(partesEnUtc('2026-01-05T16:00:00.000Z')).toEqual({ dia: 1, hora: 16 })
  })

  it('UNIT-DATETIME-06 identifica fin de semana en UTC', () => {
    // 2026-01-10 (sabado) 20:00Z
    expect(partesEnUtc('2026-01-10T20:00:00.000Z').dia).toBe(6)
  })

  it('UNIT-DATETIME-07 devuelve null para valores invalidos', () => {
    expect(partesEnUtc(null)).toBeNull()
    expect(partesEnUtc('basura')).toBeNull()
  })
})

describe('datetime.formatearEnGuayaquil (presentacion America/Guayaquil)', () => {
  it('UNIT-DATETIME-08 formatea una hora UTC como hora de Guayaquil (UTC-5)', () => {
    // 2026-01-05 20:00Z -> 15:00 en Guayaquil
    var str = formatearEnGuayaquil('2026-01-05T20:00:00.000Z', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    expect(str).toContain('15:00')
  })

  it('UNIT-DATETIME-09 devuelve null para fechas invalidas', () => {
    expect(formatearEnGuayaquil('no-fecha')).toBeNull()
    expect(formatearEnGuayaquil(null)).toBeNull()
  })
})
