import { ejecutarConsulta } from '../../config/database.js'
import { Usuario } from '../../entidades/usuario.js'

var SQL_USR = `SELECT id, identificacion, nombre, correo, contrasena, fecha_registro as "fechaRegistro"`

export async function buscarPorCorreo(correo) {
  var r = await ejecutarConsulta(`${SQL_USR} FROM Usuario WHERE correo = $1`, [correo])
  if (r.rows.length === 0) return null
  return new Usuario(r.rows[0])
}

export async function buscarPorIdentificacion(identificacion) {
  var r = await ejecutarConsulta(`${SQL_USR} FROM Usuario WHERE identificacion = $1`, [identificacion])
  if (r.rows.length === 0) return null
  return new Usuario(r.rows[0])
}

export async function crearUsuario(datos) {
  var r = await ejecutarConsulta(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4)
     RETURNING id, identificacion, nombre, correo, fecha_registro as "fechaRegistro"`,
    [datos.identificacion, datos.nombre, datos.correo, datos.contrasena]
  )
  return new Usuario(r.rows[0])
}

export async function crearCliente(idUsuario, direccion, telefono) {
  await ejecutarConsulta(
    `INSERT INTO Cliente (id_usuario, direccion, telefono)
     VALUES ($1, $2, $3)`,
    [idUsuario, direccion || null, telefono || null]
  )
}
