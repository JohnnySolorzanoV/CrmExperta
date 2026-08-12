import * as DB from '../../config/database.js'
import { Documento as Doc } from '../../entidades/documento.js'

var CAMPOS_DOC = `id, id_caso as "idCaso", nombre_documento as "nombreDocumento",
                  descripcion, extension, fecha_subida as "fechaSubida",
                  ruta_archivo as "rutaArchivo", tamaño`
var SQL_DOC = `SELECT ${CAMPOS_DOC}`

function conClient(cnn) {
  return cnn ? (txt, prms) => cnn.query(txt, prms) : DB.ejecutarConsulta
}

export async function obtenerPorCaso(idCaso) {
  var r = await DB.ejecutarConsulta(`${SQL_DOC} FROM Documento WHERE id_caso = $1 ORDER BY fecha_subida DESC`, [idCaso])
  return r.rows.map(row => new Doc(row))
}

export async function buscarPorId(id) {
  var r = await DB.ejecutarConsulta(`${SQL_DOC} FROM Documento WHERE id = $1`, [id])
  if (r.rows.length === 0) return null
  return new Doc(r.rows[0])
}

export async function crear(doc, cnn = null) {
  var q = conClient(cnn)
  var r = await q(
    `INSERT INTO Documento (id_caso, nombre_documento, descripcion, extension, ruta_archivo, tamaño)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${CAMPOS_DOC}`,
    [doc.idCaso, doc.nombreDocumento, doc.descripcion, doc.extension, doc.rutaArchivo, doc.tamaño]
  )
  return new Doc(r.rows[0])
}

export async function actualizar(id, datos, cnn = null) {
  var q = conClient(cnn)
  var r = await q(
    `UPDATE Documento SET descripcion = $1 WHERE id = $2 RETURNING ${CAMPOS_DOC}`,
    [datos.descripcion, id]
  )
  if (r.rows.length === 0) return null
  return new Doc(r.rows[0])
}

export async function eliminar(id, cnn = null) {
  var q = conClient(cnn)
  var r = await q('DELETE FROM Documento WHERE id = $1 RETURNING id', [id])
  return r.rowCount > 0
}
