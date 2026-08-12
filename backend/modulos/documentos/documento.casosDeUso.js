import * as docRepo from './documento.repositorio.js'
import { Documento as Doc } from '../../entidades/documento.js'
import { ejecutarConsulta } from '../../config/database.js'

export var EXT_PERMITIDAS = ['pdf', 'doc', 'docx', 'jpg', 'png', 'txt']
var MAX_SIZE = 10 * 1024 * 1024

export var listarDocumentos = async (idCaso) => {
  if (!idCaso) throw Object.assign(new Error('ID del caso requerido'), { status: 400 })
  return docRepo.obtenerPorCaso(idCaso)
}

export async function obtenerDocumento(id) {
  var d = await docRepo.buscarPorId(id)
  if (!d) throw Object.assign(new Error('Documento no encontrado'), { status: 404 })
  return d
}

// Un abogado solo puede subir documentos a casos en los que esté asignado.
async function validarAbogadoDelCaso(idCaso, idUsuario) {
  var r = await ejecutarConsulta(
    `SELECT 1 FROM Caso cs
     JOIN Abogado ab ON ab.id = cs.id_abogado
     WHERE cs.id = $1 AND ab.id_usuario = $2`,
    [idCaso, idUsuario]
  )
  if (r.rows.length === 0) {
    throw Object.assign(new Error('No estas asignado a este caso'), { status: 403 })
  }
}

export async function subirDocumento({ idCaso, nombreDocumento, descripcion, extension, rutaArchivo, tamaño, idUsuarioAbogado }, cnn = null) {
  if (!idCaso || !nombreDocumento || !extension) {
    throw Object.assign(new Error('Faltan datos del documento'), { status: 400 })
  }

  if (idUsuarioAbogado != null) {
    await validarAbogadoDelCaso(idCaso, idUsuarioAbogado)
  }

  var ext = extension.toLowerCase().replace('.', '')
  if (!EXT_PERMITIDAS.includes(ext)) {
    throw Object.assign(new Error(`Extension no permitida: ${ext}`), { status: 400 })
  }

  if (tamaño && tamaño > MAX_SIZE) {
    throw Object.assign(new Error('El archivo supera el tamaño maximo permitido'), { status: 400 })
  }

  var DOCUMENTO_NUEVO = new Doc({
    idCaso, nombreDocumento,
    descripcion: descripcion || '',
    extension: ext,
    rutaArchivo: rutaArchivo || `/uploads/${nombreDocumento}`,
    tamaño: tamaño || 0
  })

  return docRepo.crear(DOCUMENTO_NUEVO, cnn)
}

export var actualizarDocumento = async (id, datos, cnn = null) => {
  var d = await docRepo.actualizar(id, datos, cnn)
  if (!d) throw Object.assign(new Error('Documento no encontrado'), { status: 404 })
  return d
}

export var eliminarDocumento = async (id, cnn = null) => {
  var r = await docRepo.eliminar(id, cnn)
  if (!r) throw Object.assign(new Error('Documento no encontrado'), { status: 404 })
  return { mensaje: 'Documento eliminado' }
}
