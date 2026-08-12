import { ejecutarConsulta as query } from '../../config/database.js'
import { Cita } from '../../entidades/cita.js'
import { normalizarFechaIsoUTC } from '../../config/datetime.js'

// Si recibe un cliente (`cnn`), ejecuta dentro de esa transacción; si no, usa
// la conexión compartida. Permite validar y persistir de forma atómica.
function conClient(cnn) {
  return cnn ? (txt, prms) => cnn.query(txt, prms) : query
}

var SQL_COLS = `id, id_cliente as "idCliente", id_abogado as "idAbogado",
                fecha_hora_copia as "fechaHoraCopia", id_calendario as "idCalendario",
                motivo, estado_cita as "estadoCita", resumen_chatbot as "resumenChatbot",
                created_at as "createdAt", google_event_id as "googleEventId",
                motivo_cancelacion as "motivoCancelacion", cancelado_por as "canceladoPor"`
var SQL_CT = `SELECT ${SQL_COLS}`

function normalizarFilaCita(row) {
  return {
    ...row,
    fechaHoraCopia: normalizarFechaIsoUTC(row.fechaHoraCopia),
    createdAt: normalizarFechaIsoUTC(row.createdAt),
  }
}

export async function obtenerTodas() {
  var r = await query(`${SQL_CT} FROM Cita ORDER BY fecha_hora_copia`)
  return r.rows.map(row => new Cita(normalizarFilaCita(row)))
}

export async function buscarPorId(id) {
  var r = await query(`${SQL_CT} FROM Cita WHERE id = $1`, [id])
  if (r.rows.length === 0) return null
  return new Cita(normalizarFilaCita(r.rows[0]))
}

export async function buscarPorCliente(idC) {
  var r = await query(
    `SELECT
      c.id,
      c.id_cliente as "idCliente",
      c.id_abogado as "idAbogado",
      c.fecha_hora_copia as "fechaHoraCopia",
      c.id_calendario as "idCalendario",
      c.motivo,
      c.estado_cita as "estadoCita",
      c.resumen_chatbot as "resumenChatbot",
      c.created_at as "createdAt",
      c.google_event_id as "googleEventId",
      c.motivo_cancelacion as "motivoCancelacion",
      c.cancelado_por as "canceladoPor",
      usr.nombre as "abogadoNombre"
     FROM Cita c
     JOIN Abogado a ON a.id = c.id_abogado
     JOIN Usuario usr ON usr.id = a.id_usuario
     WHERE c.id_cliente = $1
     ORDER BY c.fecha_hora_copia`,
    [idC]
  )
  return r.rows.map(row => new Cita(normalizarFilaCita(row)))
}

export async function buscarPorAbogado(idA) {
  var r = await query(
    `SELECT
      c.id,
      c.id_cliente as "idCliente",
      c.id_abogado as "idAbogado",
      c.fecha_hora_copia as "fechaHoraCopia",
      c.id_calendario as "idCalendario",
      c.motivo,
      c.estado_cita as "estadoCita",
      c.resumen_chatbot as "resumenChatbot",
      c.created_at as "createdAt",
      c.google_event_id as "googleEventId",
      c.motivo_cancelacion as "motivoCancelacion",
      c.cancelado_por as "canceladoPor",
      uc.nombre as "clienteNombre"
     FROM Cita c
     JOIN Cliente cl ON cl.id = c.id_cliente
     JOIN Usuario uc ON uc.id = cl.id_usuario
     WHERE c.id_abogado = $1
     ORDER BY c.fecha_hora_copia`,
    [idA]
  )
  return r.rows.map(row => new Cita(normalizarFilaCita(row)))
}

export async function slotOcupado(idCal, excluirCitaId = null, cnn = null) {
  var q = conClient(cnn)
  // Las citas canceladas o rechazadas liberan el horario: no bloquean el slot.
  var sql = 'SELECT id FROM Cita WHERE id_calendario = $1 AND estado_cita NOT IN ($2, $3)'
  var params = [idCal, 'cancelada', 'rechazada']
  // Al reprogramar se excluye la propia cita en curso.
  if (excluirCitaId != null) {
    sql += ' AND id != $4'
    params.push(excluirCitaId)
  }
  var r = await q(sql, params)
  return r.rows.length > 0
}

export async function existeConflictoAbogado(idAbogado, fechaHora, excluirCitaId = null, cnn = null) {
  var q = conClient(cnn)
  var sql = `SELECT id FROM Cita
    WHERE id_abogado = $1
      AND date_trunc('hour', fecha_hora_copia) = date_trunc('hour', $2::timestamp)
      AND estado_cita NOT IN ('cancelada', 'rechazada')`
  var params = [idAbogado, fechaHora]
  if (excluirCitaId != null) {
    sql += ' AND id != $3'
    params.push(excluirCitaId)
  }
  var r = await q(sql, params)
  return r.rows.length > 0
}

export async function crear(cita, cnn = null) {
  var q = conClient(cnn)
  var r = await q(
    `INSERT INTO Cita (id_cliente, id_abogado, fecha_hora_copia, id_calendario, motivo, estado_cita, resumen_chatbot)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SQL_COLS}`,
    [cita.idCliente, cita.idAbogado, cita.fechaHoraCopia, cita.idCalendario,
     cita.motivo, cita.estadoCita, cita.resumenChatbot]
  )
  return new Cita(normalizarFilaCita(r.rows[0]))
}

export async function actualizarEstado(id, estado, cnn = null) {
  var q = conClient(cnn)
  var r = await q(
    `UPDATE Cita SET estado_cita = $1 WHERE id = $2 RETURNING ${SQL_COLS}`,
    [estado, id]
  )
  if (r.rows.length === 0) return null
  return new Cita(normalizarFilaCita(r.rows[0]))
}

/** Sets estado_cita = 'cancelada' together with the cancellation audit fields. */
export async function cancelarConMotivo(id, motivoCancelacion, canceladoPor, cnn = null) {
  var q = conClient(cnn)
  var r = await q(
    `UPDATE Cita
     SET estado_cita = 'cancelada', motivo_cancelacion = $2, cancelado_por = $3
     WHERE id = $1
     RETURNING ${SQL_COLS}`,
    [id, motivoCancelacion || null, canceladoPor || null]
  )
  if (r.rows.length === 0) return null
  return new Cita(normalizarFilaCita(r.rows[0]))
}

/** Stores the Google Calendar event ID after it has been created asynchronously. */
export async function actualizarGoogleEventId(id, googleEventId) {
  await query('UPDATE Cita SET google_event_id = $1 WHERE id = $2', [googleEventId, id])
}

export async function actualizarFecha(id, fechaHoraCopia, idCalendario, cnn = null) {
  var q = conClient(cnn)
  var r = await q(
    `UPDATE Cita SET fecha_hora_copia = $1, id_calendario = $2, estado_cita = 'reprogramada', recordatorio_enviado = FALSE
     WHERE id = $3 RETURNING ${SQL_COLS}`,
    [fechaHoraCopia, idCalendario, id]
  )
  if (r.rows.length === 0) return null
  return new Cita(normalizarFilaCita(r.rows[0]))
}

export async function eliminar(id) {
  var r = await query('DELETE FROM Cita WHERE id = $1 RETURNING id', [id])
  return r.rowCount > 0
}
