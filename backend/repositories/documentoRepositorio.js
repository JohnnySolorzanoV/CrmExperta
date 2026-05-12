import Documento from '../entities/documento.js';
import { ejecutarSQL } from '../external_integrations/baseDatos.js';

export async function buscarPorId(idDocumento) {
  const resultado = await ejecutarSQL(
    'SELECT * FROM Documento WHERE idDocumento = $1',
    [idDocumento]
  );
  return resultado.rows[0] ? new Documento(resultado.rows[0]) : null;
}

export async function obtenerTodos() {
  const resultado = await ejecutarSQL('SELECT * FROM Documento');
  return resultado.rows.map(row => new Documento(row));
}

// obtener documentos de un usuario
export async function buscarPorUsuario(cedulaUsuario) {
  const resultado = await ejecutarSQL(
    'SELECT * FROM Documento WHERE cedulaUsuario = $1 ORDER BY fechaSubida DESC',
    [cedulaUsuario]
  );
  return resultado.rows.map(row => new Documento(row));
}

export async function crear(documento) {
  const resultado = await ejecutarSQL(
    'INSERT INTO Documento (nombreArchivo, rutaArchivo, tipoDocumento, cedulaUsuario) VALUES ($1, $2, $3, $4) RETURNING *',
    [documento.nombreArchivo, documento.rutaArchivo, documento.tipoDocumento, documento.cedulaUsuario]
  );
  return new Documento(resultado.rows[0]);
}

export async function actualizar(documento) {
  const resultado = await ejecutarSQL(
    'UPDATE Documento SET nombreArchivo = $1, rutaArchivo = $2, tipoDocumento = $3 WHERE idDocumento = $4 RETURNING *',
    [documento.nombreArchivo, documento.rutaArchivo, documento.tipoDocumento, documento.idDocumento]
  );
  return resultado.rows[0] ? new Documento(resultado.rows[0]) : null;
}

export async function eliminarPorId(idDocumento) {
  const res = await ejecutarSQL(
    'DELETE FROM Documento WHERE idDocumento = $1',
    [idDocumento]
  );
  return res.rowCount > 0;
}

export default {
  buscarPorId,
  obtenerTodos,
  buscarPorUsuario,
  crear,
  actualizar,
  eliminarPorId
};
