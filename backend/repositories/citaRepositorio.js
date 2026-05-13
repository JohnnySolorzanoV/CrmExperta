import {Cita} from '../entities/cita.js';
import { ejecutarSQL } from '../external_integrations/baseDatos.js';

export async function buscarPorId(id) {
  const res = await ejecutarSQL(
    'SELECT idCita as id, id_cliente as "idCliente", id_abogado as "idAbogado", fecha, hora, motivo, estado FROM Cita WHERE idCita = $1',
    [id]
  );
  return res.rows[0] ? new Cita(res.rows[0]) : null;
}

export async function obtenerTodas() {
  const resultado = await ejecutarSQL(
    'SELECT idCita as id, id_cliente as "idCliente", id_abogado as "idAbogado", fecha, hora, motivo, estado FROM Cita'
  );
  return resultado.rows.map(row => new Cita(row));
}

// buscar citas de un cliente especifico
export async function buscarPorCliente(idCliente) {
  const resultado = await ejecutarSQL(
    'SELECT idCita as id, id_cliente as "idCliente", id_abogado as "idAbogado", fecha, hora, motivo, estado FROM Cita WHERE id_cliente = $1',
    [idCliente]
  );
  return resultado.rows.map(row => new Cita(row));
}

export async function crear(cita) {
  const resultado = await ejecutarSQL(
    'INSERT INTO Cita (id_cliente, id_abogado, fecha, hora, motivo, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [cita.idCliente, cita.idAbogado, cita.fecha, cita.hora, cita.motivo, cita.estado || 'pendiente']
  );
  // console.log('cita creada:', resultado.rows[0]);
  return new Cita({
    id: resultado.rows[0].idcita,
    idCliente: resultado.rows[0].id_cliente,
    idAbogado: resultado.rows[0].id_abogado,
    fecha: resultado.rows[0].fecha,
    hora: resultado.rows[0].hora,
    motivo: resultado.rows[0].motivo,
    estado: resultado.rows[0].estado
  });
}

export async function actualizar(cita) {
  const resultado = await ejecutarSQL(
    'UPDATE Cita SET id_cliente = $1, id_abogado = $2, fecha = $3, hora = $4, motivo = $5, estado = $6 WHERE idCita = $7 RETURNING *',
    [cita.idCliente, cita.idAbogado, cita.fecha, cita.hora, cita.motivo, cita.estado, cita.id]
  );
  return resultado.rows[0] ? new Cita(resultado.rows[0]) : null;
}

export async function eliminarPorId(id) {
  const resultado = await ejecutarSQL(
    'DELETE FROM Cita WHERE idCita = $1 RETURNING *',
    [id]
  );
  return resultado.rowCount > 0;
}

export default {
  buscarPorId,
  obtenerTodas,
  buscarPorCliente,
  crear,
  actualizar,
  eliminarPorId
};
