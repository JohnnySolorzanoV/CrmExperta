import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

var VARS_SPACES = ['SPACES_BUCKET', 'SPACES_REGION', 'SPACES_ENDPOINT', 'SPACES_KEY', 'SPACES_SECRET']

vi.mock('@aws-sdk/client-s3', () => {
  const send = vi.fn()
  return {
    S3Client: class {
      constructor(cfg) { this.cfg = cfg }
      send() { return send() }
    },
    PutObjectCommand: class { constructor(p) { this.p = p } },
    GetObjectCommand: class { constructor(p) { this.p = p } },
    DeleteObjectCommand: class { constructor(p) { this.p = p } },
    __send: send,
  }
})

function usarLocal() {
  delete process.env.STORAGE_DRIVER
  for (var k of VARS_SPACES) delete process.env[k]
}

function usarSpaces() {
  process.env.STORAGE_DRIVER = 'spaces'
  process.env.SPACES_BUCKET = 'mi-bucket'
  process.env.SPACES_REGION = 'nyc3'
  process.env.SPACES_ENDPOINT = 'https://mi-bucket.nyc3.digitaloceanspaces.com'
  process.env.SPACES_KEY = 'clave'
  process.env.SPACES_SECRET = 'secreto'
}

function crearTemporal() {
  var ruta = path.join(os.tmpdir(), `almacenamiento-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`)
  fs.writeFileSync(ruta, 'contenido de prueba')
  return ruta
}

describe('config/almacenamiento', () => {
  beforeEach(() => {
    vi.resetModules()
    usarLocal()
    vi.clearAllMocks()
  })

  it('UNIT-ALMACENAMIENTO-01 selecciona el driver local por defecto', async () => {
    var { driver } = await import('../../config/almacenamiento.js')
    expect(driver).toBe('local')
  })

  it('UNIT-ALMACENAMIENTO-02 selecciona spaces cuando hay credenciales completas', async () => {
    usarSpaces()
    var { driver, esEspacios } = await import('../../config/almacenamiento.js')
    expect(driver).toBe('spaces')
    expect(esEspacios).toBe(true)
  })

  it('UNIT-ALMACENAMIENTO-03 cae a local si faltan credenciales spaces', async () => {
    usarSpaces()
    delete process.env.SPACES_BUCKET
    var { driver } = await import('../../config/almacenamiento.js')
    expect(driver).toBe('local')
  })

  it('UNIT-ALMACENAMIENTO-04 claveDesdeRuta normaliza el prefijo /uploads', async () => {
    var { claveDesdeRuta } = await import('../../config/almacenamiento.js')
    expect(claveDesdeRuta('/uploads/a.pdf')).toBe('uploads/a.pdf')
    expect(claveDesdeRuta('uploads/a.pdf')).toBe('uploads/a.pdf')
    expect(claveDesdeRuta('')).toBe('')
  })

  it('UNIT-ALMACENAMIENTO-05 guardarArchivo en local no elimina el archivo y no devuelve clave', async () => {
    var { guardarArchivo } = await import('../../config/almacenamiento.js')
    var tmp = crearTemporal()
    var clave = await guardarArchivo(tmp, 'uploads/a.txt')
    expect(clave).toBe(null)
    expect(fs.existsSync(tmp)).toBe(true)
    fs.unlinkSync(tmp)
  })

  it('UNIT-ALMACENAMIENTO-06 guardarArchivo en spaces sube y elimina el temporal', async () => {
    usarSpaces()
    var { guardarArchivo } = await import('../../config/almacenamiento.js')
    var { __send } = await import('@aws-sdk/client-s3')
    __send.mockResolvedValue({})
    var tmp = crearTemporal()
    var clave = await guardarArchivo(tmp, 'uploads/a.txt')
    expect(clave).toBe('uploads/a.txt')
    expect(fs.existsSync(tmp)).toBe(false)
    expect(__send).toHaveBeenCalledTimes(1)
  })

  it('UNIT-ALMACENAMIENTO-07 eliminarArchivo en spaces invoca DeleteObject', async () => {
    usarSpaces()
    var { eliminarArchivo } = await import('../../config/almacenamiento.js')
    var { __send } = await import('@aws-sdk/client-s3')
    __send.mockResolvedValue({})
    var eliminado = await eliminarArchivo('uploads/a.txt')
    expect(eliminado).toBe(true)
    expect(__send).toHaveBeenCalledTimes(1)
  })

  it('UNIT-ALMACENAMIENTO-08 eliminarArchivo en local delega false', async () => {
    var { eliminarArchivo } = await import('../../config/almacenamiento.js')
    expect(await eliminarArchivo('uploads/a.txt')).toBe(false)
  })
})