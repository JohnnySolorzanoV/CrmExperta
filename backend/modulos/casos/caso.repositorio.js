import { ejecutarConsulta } from '../../config/database.js'
import { Caso } from '../../entidades/caso.js'

var SQL_CAMPOS = `id, estado_caso as "estadoCaso", fecha_apertura as "fechaApertura",
                  tipo_caso as "tipoCaso", nombre_caso as "nombreCaso",
                  id_cliente as "idCliente", id_abogado as "idAbogado"`

export async function obtenerTodos() {
  var r = await ejecutarConsulta(`SELECT ${SQL_CAMPOS} FROM Caso ORDER BY fecha_apertura DESC`)
  return r.rows.map(row => new Caso(row))
}

export async function buscarPorId(id) {
  var r = await ejecutarConsulta(
    `SELECT
      c.id,
      c.estado_caso as "estadoCaso",
      c.fecha_apertura as "fechaApertura",
      c.tipo_caso as "tipoCaso",
      c.nombre_caso as "nombreCaso",
      c.id_cliente as "idCliente",
      c.id_abogado as "idAbogado",
      uc.nombre as "clienteNombre",
      ua.nombre as "abogadoNombre"
     FROM Caso c
     JOIN Cliente cl ON cl.id = c.id_cliente
     JOIN Usuario uc ON uc.id = cl.id_usuario
     JOIN Abogado ab ON ab.id = c.id_abogado
     JOIN Usuario ua ON ua.id = ab.id_usuario
     WHERE c.id = $1`,
    [id]
  )
  if (r.rows.length === 0) return null
  return new Caso(r.rows[0])
}

export async function buscarPorCliente(idC) {
  var r = await ejecutarConsulta(`SELECT ${SQL_CAMPOS} FROM Caso WHERE id_cliente = $1 ORDER BY fecha_apertura DESC`, [idC])
  return r.rows.map(row => new Caso(row))
}

export async function buscarPorAbogado(idA) {
  var r = await ejecutarConsulta(`SELECT ${SQL_CAMPOS} FROM Caso WHERE id_abogado = $1 ORDER BY fecha_apertura DESC`, [idA])
  return r.rows.map(row => new Caso(row))
}

export async function crear(caso) {
  var r = await ejecutarConsulta(
    `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${SQL_CAMPOS}`,
    [caso.estadoCaso, caso.tipoCaso, caso.nombreCaso, caso.idCliente, caso.idAbogado]
  )
  return new Caso(r.rows[0])
}

export async function actualizarEstado(id, estado) {
  var r = await ejecutarConsulta(
    `UPDATE Caso SET estado_caso = $1 WHERE id = $2 RETURNING ${SQL_CAMPOS}`,
    [estado, id]
  )
  if (r.rows.length === 0) return null
  return new Caso(r.rows[0])
}
