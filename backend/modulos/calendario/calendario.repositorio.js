import { ejecutarConsulta } from '../../config/database.js'
import { Calendario } from '../../entidades/calendario.js'
import { normalizarFechaIsoUTC } from '../../config/datetime.js'

var SQL_CAL = `SELECT id, id_abogado as "idAbogado", fecha_evento as "fechaEvento", descripcion`

function normalizarFilaSlot(row) {
  return {
    ...row,
    fechaEvento: normalizarFechaIsoUTC(row.fechaEvento),
  }
}

export async function obtenerPorAbogado(idAbogado) {
  var r = await ejecutarConsulta(
    `${SQL_CAL} FROM Calendario WHERE id_abogado = $1 ORDER BY fecha_evento`,
    [idAbogado]
  )
  return r.rows.map(row => new Calendario(normalizarFilaSlot(row)))
}

export async function buscarPorId(id) {
  var r = await ejecutarConsulta(`${SQL_CAL} FROM Calendario WHERE id = $1`, [id])
  if (r.rows.length === 0) return null
  return new Calendario(normalizarFilaSlot(r.rows[0]))
}

export async function crear(slot) {
  var r = await ejecutarConsulta(
    `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion)
     VALUES ($1, $2, $3)
     RETURNING ${SQL_CAL}`,
    [slot.idAbogado, slot.fechaEvento, slot.descripcion]
  )
  return new Calendario(normalizarFilaSlot(r.rows[0]))
}

export async function eliminar(id) {
  var r = await ejecutarConsulta('DELETE FROM Calendario WHERE id = $1 RETURNING id', [id])
  return r.rowCount > 0
}
