import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { obtenerCredencialesAdmin } from '../../config/credencialesAdmin.js'

var __dirname = dirname(fileURLToPath(import.meta.url))

describe('credenciales de administrador para el seed (RFC11)', () => {
  it('RFC11-01 en desarrollo permite los valores por defecto cuando no hay variables', () => {
    var c = obtenerCredencialesAdmin({ env: {}, nodeEnv: 'development' })
    expect(c.correo).toBe('admin@crm.com')
    expect(c.contrasena).toBe('admin123')
    expect(c.esDesarrollo).toBe(true)
  })

  it('RFC11-02 en desarrollo respeta las variables definidas en vez de los defaults', () => {
    var c = obtenerCredencialesAdmin({
      env: { ADMIN_CORREO: 'admin@empresa.com', ADMIN_CONTRASENA: 'ClaveFuerte*' },
      nodeEnv: 'development',
    })
    expect(c.correo).toBe('admin@empresa.com')
    expect(c.contrasena).toBe('ClaveFuerte*')
  })

  it('RFC11-03 en produccion usa ADMIN_CONTRASENA y no la clave por defecto', () => {
    var c = obtenerCredencialesAdmin({
      env: { ADMIN_CORREO: 'admin@empresa.com', ADMIN_CONTRASENA: 'S3cret0!' },
      nodeEnv: 'production',
    })
    expect(c.correo).toBe('admin@empresa.com')
    expect(c.contrasena).toBe('S3cret0!')
    expect(c.esDesarrollo).toBe(false)
  })

  it('RFC11-04 en produccion se detiene si faltan ADMIN_CORREO o ADMIN_CONTRASENA', () => {
    expect(() => obtenerCredencialesAdmin({ env: {}, nodeEnv: 'production' })).toThrow()
    expect(() => obtenerCredencialesAdmin({ env: { ADMIN_CORREO: 'a@b.com' }, nodeEnv: 'production' })).toThrow()
    expect(() => obtenerCredencialesAdmin({ env: { ADMIN_CONTRASENA: 'clave' }, nodeEnv: 'production' })).toThrow()
  })

  it('RFC11-05 cualquier entorno que no sea development exige credenciales seguras', () => {
    expect(() => obtenerCredencialesAdmin({ env: {}, nodeEnv: 'staging' })).toThrow()
  })

  it('RFC11-06 seed.js usa ADMIN_CONTRASENA de forma consistente y no imprime la contrasena', () => {
    var seed = readFileSync(resolve(__dirname, '../../seed.js'), 'utf8')
    var config = readFileSync(resolve(__dirname, '../../config/credencialesAdmin.js'), 'utf8')
    expect(config).toMatch(/ADMIN_CONTRASENA/)
    expect(config).not.toMatch(/ADMIN_CONTROSENA/)
    expect(seed).not.toMatch(/ADMIN_CONTROSENA/)
    expect(seed).not.toMatch(/'pass:'/)
    expect(seed).not.toMatch(/console\.log\([^)]*PASS_ADMIN/)
    expect(seed).not.toMatch(/console\.log\([^)]*pass/)
  })

  it('RFC11-07 seed.js se detiene (exit 1) si se ejecuta en produccion sin variables', async () => {
    var { spawnSync } = await import('node:child_process')
    var r = spawnSync('node', ['seed.js'], {
      cwd: resolve(__dirname, '../..'),
      env: { ...process.env, NODE_ENV: 'production' },
      encoding: 'utf8',
      timeout: 30000,
    })
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/ADMIN_CORREO y ADMIN_CONTRASENA/)
    expect(r.stdout).not.toMatch(/admin123/)
  })
})
