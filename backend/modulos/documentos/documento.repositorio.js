import * as DB from '../../config/database.js'
import { Documento as Doc } from '../../entidades/documento.js'

var SQL_DOC = `SELECT id, id_caso as "idCaso", nombre_documento as "nombreDocumento",
                      descripcion, extension, fecha_subida as "fechaSubida",
                      ruta_archivo as "rutaArchivo", tamaño`

export async function obtenerPorCaso(idCaso) {
  var r = await DB.ejecutarConsulta(`${SQL_DOC} FROM Documento WHERE id_caso = $1 ORDER BY fecha_subida DESC`, [idCaso])
  return r.rows.map(row => new Doc(row))
}

export async function buscarPorId(id) {
  var r = await DB.ejecutarConsulta(`${SQL_DOC} FROM Documento WHERE id = $1`, [id])
  if (r.rows.length === 0) return null
  return new Doc(r.rows[0])
}

export async function crear(doc) {
  var r = await DB.ejecutarConsulta(
    `INSERT INTO Documento (id_caso, nombre_documento, descripcion, extension, ruta_archivo, tamaño)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${SQL_DOC}`,
    [doc.idCaso, doc.nombreDocumento, doc.descripcion, doc.extension, doc.rutaArchivo, doc.tamaño]
  )
  return new Doc(r.rows[0])
}

export async function actualizar(id, datos) {
  var r = await DB.ejecutarConsulta(
    `UPDATE Documento SET descripcion = $1 WHERE id = $2 RETURNING ${SQL_DOC}`,
    [datos.descripcion, id]
  )
  if (r.rows.length === 0) return null
  return new Doc(r.rows[0])
}

export async function eliminar(id) {
  var r = await DB.ejecutarConsulta('DELETE FROM Documento WHERE id = $1 RETURNING id', [id])
  return r.rowCount > 0
}
