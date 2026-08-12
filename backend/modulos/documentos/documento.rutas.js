import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { fileURLToPath } from 'node:url'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarDuenoCaso, verificarDuenoDocumento } from '../../config/autorizacion.js'
import { ejecutarConAuditoria } from '../auditoria/auditoria.servicio.js'
import {
  esEspacios, claveDesdeRuta, guardarArchivo, obtenerArchivo, eliminarArchivo
} from '../../config/almacenamiento.js'
import {
  listarDocumentos, obtenerDocumento, subirDocumento,
  actualizarDocumento, eliminarDocumento
} from './documento.casosDeUso.js'

var router = Router()
var __filename = fileURLToPath(import.meta.url)
var __dirname = path.dirname(__filename)
var UPLOAD_DIR = path.resolve(__dirname, '../../uploads')
var MAX_FILE_SIZE = 10 * 1024 * 1024

// MIME esperado para cada extension permitida. MIME y extension se validan en
// conjunto (fileFilter), ANTES de que multer escriba el archivo en disco, de
// modo que un archivo invalido jamas se almacena.
var MIME_POR_EXTENSION = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  txt: ['text/plain'],
}

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

// Validacion conjunta de extension y MIME antes de escribir el archivo.
function validarArchivo(_req, file, cb) {
  var ext = path.extname(file.originalname || '').slice(1).toLowerCase()
  var mime = String(file.mimetype || '').toLowerCase()
  var mimesValidos = MIME_POR_EXTENSION[ext]
  if (!mimesValidos) {
    return cb(Object.assign(new Error(`Extension no permitida: ${ext || '(sin extension)'}`), { status: 400 }))
  }
  // application/octet-stream se tolera como fallback de algunos navegadores/SO;
  // cualquier otro MIME debe coincidir con el esperado para la extension.
  if (mime !== 'application/octet-stream' && !mimesValidos.includes(mime)) {
    return cb(Object.assign(new Error(`Tipo MIME no corresponde a la extension .${ext}`), { status: 400 }))
  }
  cb(null, true)
}

var uploadDocumento = multer({
  storage: almacenamiento,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: validarArchivo,
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

router.get('/caso/:idCaso', verificarToken, (req, res, next) => verificarDuenoCaso(req, res, next, 'idCaso'), async (req, res, next) => {
  try {
    var DOCS = await listarDocumentos(Number(req.params.idCaso))
    res.json({ documentos: DOCS })
  } catch (error) { next(error) }
})

router.get('/:id/descargar', verificarToken, (req, res, next) => verificarDuenoDocumento(req, res, next, 'id'), async (req, res, next) => {
  try {
    var d = await obtenerDocumento(Number(req.params.id))
    if (!d?.rutaArchivo) {
      throw Object.assign(new Error('El documento no tiene archivo asociado'), { status: 404 })
    }
    var nombreDescarga = d.nombreDocumento || path.basename(d.rutaArchivo)

    // Spaces: el objeto no vive en disco; se proxy el stream desde la nube,
    // conservando la autorización (verificarDuenoDocumento) y el formato actual.
    if (esEspacios) {
      var objeto = await obtenerArchivo(claveDesdeRuta(d.rutaArchivo))
      if (!objeto) {
        throw Object.assign(new Error('Archivo no encontrado en el servidor'), { status: 404 })
      }
      var ext = path.extname(d.rutaArchivo || '').slice(1).toLowerCase()
      res.setHeader('Content-Type', (MIME_POR_EXTENSION[ext] || [])[0] || 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${nombreDescarga}"`)
      if (objeto.size) res.setHeader('Content-Length', objeto.size)
      objeto.stream.pipe(res)
      return
    }

    // local: servimos el archivo directamente desde el disco.
    var resolucion = resolverRutaArchivo(d)
    var rutaAbsoluta = resolucion.rutaAbsoluta
    if (!fs.existsSync(rutaAbsoluta)) {
      throw Object.assign(new Error('Archivo no encontrado en el servidor'), { status: 404 })
    }
    res.download(rutaAbsoluta, nombreDescarga)
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, (req, res, next) => verificarDuenoDocumento(req, res, next, 'id'), async (req, res, next) => {
  try {
    var d = await obtenerDocumento(Number(req.params.id))
    res.json({ documento: d })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('abogado'), subirArchivoMiddleware, async (req, res, next) => {
  var claveSubida = null
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
      // Spaces: sube el temporal a la nube (y lo elimina del disco). local: no-op.
      claveSubida = await guardarArchivo(req.file.path, claveDesdeRuta(payload.rutaArchivo))
    }

    payload.idUsuarioAbogado = req.usuario.id

    var d = await ejecutarConAuditoria({
      req,
      accion: 'CREAR',
      recurso: 'Documento',
      detalle: 'subida de documento',
      tarea: (cnn) => subirDocumento(payload, cnn),
    })
    res.status(201).json({ mensaje: 'Documento subido', documento: d })
  } catch (error) {
    // Si multer ya escribió el archivo (o se subió a Spaces) pero la operación en
    // BD falló (caso no asignado, fallo de base, auditoría, etc.), se limpia para
    // que no queden archivos huérfanos y la base quede sincronizada con el almacén.
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    if (claveSubida) {
      await eliminarArchivo(claveSubida).catch(() => {})
    }
    next(error)
  }
})

router.put('/:id', verificarToken, verificarDuenoDocumento, verificarRol('abogado'), async (req, res, next) => {
  try {
    var d = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Documento',
      detalle: 'actualizacion de descripcion del documento',
      tarea: (cnn) => actualizarDocumento(Number(req.params.id), req.body, cnn),
    })
    res.json({ mensaje: 'Documento actualizado', documento: d })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarDuenoDocumento, verificarRol('abogado'), async (req, res, next) => {
  try {
    var id = Number(req.params.id)
    var doc = await obtenerDocumento(id)
    var R = await ejecutarConAuditoria({
      req,
      accion: 'ELIMINAR',
      recurso: 'Documento',
      recursoId: id,
      detalle: 'eliminacion de documento y de su archivo',
      tarea: (cnn) => eliminarDocumento(id, cnn),
    })
    // El archivo se borra SOLO después de confirmar el DELETE en BD: si la
    // operación (o su auditoría) falla, no queda un archivo huérfano.
    if (esEspacios) {
      await eliminarArchivo(claveDesdeRuta(doc.rutaArchivo))
    } else {
      var resolucion = resolverRutaArchivo(doc)
      if (resolucion.rutaAbsoluta && fs.existsSync(resolucion.rutaAbsoluta)) {
        fs.unlinkSync(resolucion.rutaAbsoluta)
      }
    }
    res.json({ ...R, archivoEliminado: true })
  } catch (error) { next(error) }
})

export default router
