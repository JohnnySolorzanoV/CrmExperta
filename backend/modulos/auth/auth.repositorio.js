import { ejecutarConsulta } from '../../config/database.js'
import { Usuario } from '../../entidades/usuario.js'

var SQL_USR = `SELECT id, identificacion, nombre, correo, contrasena, fecha_registro as "fechaRegistro"`

export async function buscarPorCorreo(mail) {
  var r = await ejecutarConsulta(`${SQL_USR} FROM Usuario WHERE correo = $1`, [mail])
  if (r.rows.length === 0) return null
  return new Usuario(r.rows[0])
}

export async function buscarPorIdentificacion(identidad) {
  var r = await ejecutarConsulta(`${SQL_USR} FROM Usuario WHERE identificacion = $1`, [identidad])
  if (r.rows.length === 0) return null
  return new Usuario(r.rows[0])
}

export async function crear(usr) {
  var r = await ejecutarConsulta(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4)
     RETURNING id, identificacion, nombre, correo, fecha_registro as "fechaRegistro"`,
    [usr.identificacion, usr.nombre, usr.correo, usr.contrasena]
  )
  return new Usuario(r.rows[0])
}

export async function crearCliente(idU) {
  await ejecutarConsulta('INSERT INTO Cliente (id_usuario) VALUES ($1) ON CONFLICT DO NOTHING', [idU])
}

export async function detectarRoles(idU) {
  var roles_array = []

  var admin_check = await ejecutarConsulta('SELECT id FROM Administrador WHERE id_usuario = $1', [idU])
  if (admin_check.rows.length > 0) roles_array.push('administrador')

  var abogado_check = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idU])
  if (abogado_check.rows.length > 0) roles_array.push('abogado')

  var cliente_check = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idU])
  if (cliente_check.rows.length > 0) roles_array.push('cliente')

  return roles_array
}
