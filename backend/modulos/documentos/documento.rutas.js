import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { fileURLToPath } from 'node:url'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import {
  listarDocumentos, obtenerDocumento, subirDocumento,
  actualizarDocumento, eliminarDocumento
} from './documento.casosDeUso.js'

var router = Router()
var __filename = fileURLToPath(import.meta.url)
var __dirname = path.dirname(__filename)
var UPLOAD_DIR = path.resolve(__dirname, '../../uploads')
var MAX_FILE_SIZE = 10 * 1024 * 1024

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

var almacenamiento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    var nombreBase = path.parse(file.originalname || 'documento').name
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 80) || 'documento'
    var extension = path.extname(file.originalname || '').toLowerCase()
    cb(null, `${Date.now()}-${nombreBase}${extension}`)
  }
})

var uploadDocumento = multer({
  storage: almacenamiento,
  limits: { fileSize: MAX_FILE_SIZE }
})

function normalizarNombreBase(nombre) {
  return (nombre || '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 80) || 'documento'
}

function resolverRutaArchivo(d) {
  var nombreArchivo = path.basename(d.rutaArchivo || '')
  var rutaAbsoluta = path.join(UPLOAD_DIR, nombreArchivo)
  if (fs.existsSync(rutaAbsoluta)) {
    return { rutaAbsoluta, nombreArchivo, estrategia: 'directa' }
  }

  var extension = path.extname(nombreArchivo || '').toLowerCase()
  var base = path.parse(nombreArchivo || '').name
  var baseNormalizada = normalizarNombreBase(base)
  var regexLegacy = new RegExp(`^\\d+-${baseNormalizada.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${extension.replace('.', '\\.')}$`)
  var candidato = fs.readdirSync(UPLOAD_DIR).find((fileName) => regexLegacy.test(fileName))
  if (!candidato) return { rutaAbsoluta, nombreArchivo, estrategia: 'sin_match' }
  return {
    rutaAbsoluta: path.join(UPLOAD_DIR, candidato),
    nombreArchivo: candidato,
    estrategia: 'legacy_por_patron'
  }
}

function subirArchivoMiddleware(req, res, next) {
  uploadDocumento.single('archivo')(req, res, (error) => {
    if (!error) return next()
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(Object.assign(new Error('El archivo supera el tamaño maximo permitido'), { status: 400 }))
    }
    return next(Object.assign(new Error(error.message || 'Error al procesar el archivo'), { status: 400 }))
  })
}

router.get('/caso/:idCaso', verificarToken, async (req, res, next) => {
  try {
    var DOCS = await listarDocumentos(Number(req.params.idCaso))
    res.json({ documentos: DOCS })
  } catch (error) { next(error) }
})

router.get('/:id/descargar', verificarToken, async (req, res, next) => {
  try {
    var d = await obtenerDocumento(Number(req.params.id))
    if (!d?.rutaArchivo) {
      throw Object.assign(new Error('El documento no tiene archivo asociado'), { status: 404 })
    }
    var resolucion = resolverRutaArchivo(d)
    var nombreArchivo = resolucion.nombreArchivo
    var rutaAbsoluta = resolucion.rutaAbsoluta
    if (!fs.existsSync(rutaAbsoluta)) {
      throw Object.assign(new Error('Archivo no encontrado en el servidor'), { status: 404 })
    }
    var nombreDescarga = d.nombreDocumento || nombreArchivo
    res.download(rutaAbsoluta, nombreDescarga)
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, async (req, res, next) => {
  try {
    var d = await obtenerDocumento(Number(req.params.id))
    res.json({ documento: d })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('abogado', 'administrador'), subirArchivoMiddleware, async (req, res, next) => {
  try {
    var payload = {
      ...req.body
    }

    if (req.file) {
      var extensionArchivo = path.extname(req.file.originalname || '').replace('.', '')
      payload.nombreDocumento = payload.nombreDocumento || req.file.originalname
      payload.extension = payload.extension || extensionArchivo
      payload.rutaArchivo = `/uploads/${req.file.filename}`
      payload.tamaño = req.file.size
    }

    var d = await subirDocumento(payload)
    res.status(201).json({ mensaje: 'Documento subido', documento: d })
  } catch (error) { next(error) }
})

router.put('/:id', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var d = await actualizarDocumento(Number(req.params.id), req.body)
    res.json({ mensaje: 'Documento actualizado', documento: d })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var R = await eliminarDocumento(Number(req.params.id))
    res.json(R)
  } catch (error) { next(error) }
})

export default router
