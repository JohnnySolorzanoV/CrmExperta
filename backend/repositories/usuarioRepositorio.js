import Usuario from '../entities/usuario.js';
import { ejecutarSQL } from '../external_integrations/baseDatos.js';

export async function buscarPorCedula(cedula) {
  const res = await ejecutarSQL(
    'SELECT id, identificacion, nombre, correo, contrasena, rol FROM Usuario WHERE identificacion = $1',
    [cedula]
  );
  return res.rows[0] ? new Usuario(res.rows[0]) : null;
}

export async function buscarPorCorreo(correo) {
  const resultado = await ejecutarSQL(
    'SELECT id, identificacion, nombre, correo, contrasena, rol FROM Usuario WHERE correo = $1',
    [correo]
  );
  const row = resultado.rows[0];
  return row ? new Usuario(row) : null;
}

export async function obtenerTodos() {
  const resultado = await ejecutarSQL(
    'SELECT id, identificacion, nombre, correo, contrasena, rol FROM Usuario'
  );
  return resultado.rows.map(row => new Usuario(row));
}

export async function crear(usuario) {
  const resultado = await ejecutarSQL(
    'INSERT INTO Usuario (identificacion, nombre, correo, contrasena, rol) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [usuario.identificacion, usuario.nombre, usuario.correo, usuario.contrasena, usuario.rol]
  );
  return new Usuario(resultado.rows[0]);
}

export async function actualizar(usuario) {
  const resultado = await ejecutarSQL(
    'UPDATE Usuario SET nombre = $1, correo = $2, contrasena = $3, rol = $4 WHERE identificacion = $5 RETURNING *',
    [usuario.nombre, usuario.correo, usuario.contrasena, usuario.rol, usuario.identificacion]
  );
  return resultado.rows[0] ? new Usuario(resultado.rows[0]) : null;
}

export async function eliminarPorCedula(cedula) {
  const resultado = await ejecutarSQL(
    'DELETE FROM Usuario WHERE identificacion = $1 RETURNING *',
    [cedula]
  );
  return resultado.rows[0] ? new Usuario(resultado.rows[0]) : null;
}

// exportar todo junto tambien por si acaso
export default {
  buscarPorCedula,
  buscarPorCorreo,
  obtenerTodos,
  crear,
  actualizar,
  eliminarPorCedula
};
