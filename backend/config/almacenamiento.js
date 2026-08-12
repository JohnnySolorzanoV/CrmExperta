import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { log } from './logger.js'

var __filename = fileURLToPath(import.meta.url)
var __dirname = path.dirname(__filename)

// Adaptador de almacenamiento de archivos.
//
// Dos drivers:
//  - 'local'  (por defecto): guarda en el sistema de archivos bajo UPLOAD_DIR.
//  - 'spaces' : DigitalOcean Spaces (compatible con S3). Se activa SOLO si se
//               define STORAGE_DRIVER=spaces y existen todas las variables
//               SPACES_*. Si faltan credenciales, se cae a 'local' para que el
//               desarrollo jamas se rompa por falta de configuración en la nube.
//
// La base de datos guarda la clave como `/uploads/<archivo>`. La función
// `claveDesdeRuta` normaliza esa ruta al key real del objeto ('uploads/...').

var UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads')

function configEspacios() {
  var bucket = process.env.SPACES_BUCKET
  var region = process.env.SPACES_REGION
  var endpoint = process.env.SPACES_ENDPOINT
  var key = process.env.SPACES_KEY
  var secret = process.env.SPACES_SECRET
  if (!bucket || !region || !endpoint || !key || !secret) return null
  return { bucket, region, endpoint, key, secret }
}

var cfgEspacios = configEspacios()

function resolverDriver() {
  if (process.env.STORAGE_DRIVER === 'spaces') {
    if (cfgEspacios) return 'spaces'
    log.warn('ALMACENAMIENTO_FALLBACK_LOCAL', { razon: 'SPACES_* incompletas' })
  }
  return 'local'
}

export var driver = resolverDriver()
export var esEspacios = driver === 'spaces'

var clienteS3 = null
if (driver === 'spaces') {
  clienteS3 = new S3Client({
    region: cfgEspacios.region,
    endpoint: cfgEspacios.endpoint,
    forcePathStyle: false,
    credentials: { accessKeyId: cfgEspacios.key, secretAccessKey: cfgEspacios.secret },
  })
}

export function claveDesdeRuta(rutaArchivo) {
  return String(rutaArchivo || '').replace(/^\/+/, '')
}

// Guarda un archivo temporal ya escrito en disco por multer.
//  - local : no hace nada (el archivo ya está en UPLOAD_DIR).
//  - spaces: sube el objeto y elimina el temporal del disco.
// Devuelve la clave del objeto guardado (para poder limpiarla si la BD falla).
export async function guardarArchivo(rutaLocal, clave) {
  if (driver === 'local') return null
  var contenido = fs.readFileSync(rutaLocal)
  await clienteS3.send(
    new PutObjectCommand({
      Bucket: cfgEspacios.bucket,
      Key: clave,
      Body: contenido,
    })
  )
  fs.unlinkSync(rutaLocal)
  return clave
}

// Devuelve el contenido del objeto.
//  - local : null; la ruta se resuelve y sirve directamente desde el disco.
//  - spaces: { stream, contentType, size } del objeto en Spaces.
export async function obtenerArchivo(clave) {
  if (driver === 'local') return null
  var r = await clienteS3.send(
    new GetObjectCommand({ Bucket: cfgEspacios.bucket, Key: clave })
  )
  return {
    stream: r.Body,
    contentType: r.ContentType,
    size: Number(r.ContentLength) || undefined,
  }
}

// Elimina el objeto. Devuelve true solo si lo maneja el driver (spaces); en
// local el caller borra el archivo físico desde el disco.
export async function eliminarArchivo(clave) {
  if (driver === 'local') return false
  await clienteS3.send(
    new DeleteObjectCommand({ Bucket: cfgEspacios.bucket, Key: clave })
  )
  return true
}

export function rutaLocalAbsoluta(nombreArchivo) {
  return path.join(UPLOAD_DIR, nombreArchivo)
}

export { UPLOAD_DIR }