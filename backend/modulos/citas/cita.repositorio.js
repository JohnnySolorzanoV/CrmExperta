import { ejecutarConsulta as query } from '../../config/database.js'
import { Cita } from '../../entidades/cita.js'

var SQL_COLS = `id, id_cliente as "idCliente", id_abogado as "idAbogado",
                fecha_hora_copia as "fechaHoraCopia", id_calendario as "idCalendario",
                motivo, estado_cita as "estadoCita", resumen_chatbot as "resumenChatbot",
                created_at as "createdAt"`
var SQL_CT = `SELECT ${SQL_COLS}`

export async function obtenerTodas() {
  var r = await query(`${SQL_CT} FROM Cita ORDER BY fecha_hora_copia`)
  return r.rows.map(row => new Cita(row))
}

export async function buscarPorId(id) {
  var r = await query(`${SQL_CT} FROM Cita WHERE id = $1`, [id])
  if (r.rows.length === 0) return null
  return new Cita(r.rows[0])
}

export async function buscarPorCliente(idC) {
  var r = await query(`${SQL_CT} FROM Cita WHERE id_cliente = $1 ORDER BY fecha_hora_copia`, [idC])
  return r.rows.map(row => new Cita(row))
}

export async function buscarPorAbogado(idA) {
  var r = await query(`${SQL_CT} FROM Cita WHERE id_abogado = $1 ORDER BY fecha_hora_copia`, [idA])
  return r.rows.map(row => new Cita(row))
}

export async function slotOcupado(idCal) {
  var r = await query('SELECT id FROM Cita WHERE id_calendario = $1 AND estado_cita != $2', [idCal, 'cancelada'])
  return r.rows.length > 0
}

export async function crear(cita) {
  var r = await query(
    `INSERT INTO Cita (id_cliente, id_abogado, fecha_hora_copia, id_calendario, motivo, estado_cita, resumen_chatbot)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SQL_COLS}`,
    [cita.idCliente, cita.idAbogado, cita.fechaHoraCopia, cita.idCalendario,
     cita.motivo, cita.estadoCita, cita.resumenChatbot]
  )
  return new Cita(r.rows[0])
}

export async function actualizarEstado(id, estado) {
  var r = await query(
    `UPDATE Cita SET estado_cita = $1 WHERE id = $2 RETURNING ${SQL_COLS}`,
    [estado, id]
  )
  if (r.rows.length === 0) return null
  return new Cita(r.rows[0])
}

export async function actualizarFecha(id, fechaHoraCopia, idCalendario) {
  var r = await query(
    `UPDATE Cita SET fecha_hora_copia = $1, id_calendario = $2, estado_cita = 'reprogramada'
     WHERE id = $3 RETURNING ${SQL_COLS}`,
    [fechaHoraCopia, idCalendario, id]
  )
  if (r.rows.length === 0) return null
  return new Cita(r.rows[0])
}

export async function eliminar(id) {
  var r = await query('DELETE FROM Cita WHERE id = $1 RETURNING id', [id])
  return r.rowCount > 0
}
