import { ejecutarConsulta as sqlExec } from '../../config/database.js'
import { Usuario } from '../../entidades/usuario.js'

var CAMPOS_USUARIO = `id, identificacion, nombre, correo, fecha_registro as "fechaRegistro"`

export async function obtenerTodos() {
  var r = await sqlExec(`SELECT ${CAMPOS_USUARIO} FROM Usuario ORDER BY id`)
  return r.rows.map(row => new Usuario(row))
}

export async function crear(datos) {
  var r = await sqlExec(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4)
     RETURNING ${CAMPOS_USUARIO}`,
    [datos.identificacion, datos.nombre, datos.correo, datos.contrasena]
  )
  var r2 = await sqlExec('INSERT INTO Cliente (id_usuario) VALUES ($1)', [r.rows[0].id]);
  return new Usuario(r.rows[0])
}

export async function buscarPorId(id) {
  var r = await sqlExec(`SELECT ${CAMPOS_USUARIO} FROM Usuario WHERE id = $1`, [id])
  if (r.rows.length === 0) return null
  return new Usuario(r.rows[0])
}

export async function actualizar(id, datos) {
  var r = await sqlExec(
    `UPDATE Usuario SET nombre = $1, correo = $2 WHERE id = $3
     RETURNING ${CAMPOS_USUARIO}`,
    [datos.nombre, datos.correo, id]
  )
  if (r.rows.length === 0) return null
  return new Usuario(r.rows[0])
}

export async function eliminar(id) {
  var r = await sqlExec('DELETE FROM Usuario WHERE id = $1 RETURNING id', [id])
  return r.rowCount > 0
}

export async function asignarRol(idU, rol, extra = {}) {
  if (rol === 'administrador') {
    await sqlExec('INSERT INTO Administrador (id_usuario) VALUES ($1) ON CONFLICT DO NOTHING', [idU])
  } else if (rol === 'abogado') {
    await sqlExec(
      'INSERT INTO Abogado (id_usuario, num_licencia, especialidad) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [idU, extra.numLicencia, extra.especialidad]
    )
  } else if (rol === 'cliente') {
    await sqlExec('INSERT INTO Cliente (id_usuario) VALUES ($1) ON CONFLICT DO NOTHING', [idU])
  }
}

export async function quitarRol(idU, rol) {
  if (rol === 'administrador') {
    await sqlExec('DELETE FROM Administrador WHERE id_usuario = $1', [idU])
  } else if (rol === 'abogado') {
    await sqlExec('DELETE FROM Abogado WHERE id_usuario = $1', [idU])
  } else if (rol === 'cliente') {
    await sqlExec('DELETE FROM Cliente WHERE id_usuario = $1', [idU])
  }
}

export async function obtenerRoles(idU) {
  var ROLES = []

  var a = await sqlExec('SELECT id FROM Administrador WHERE id_usuario = $1', [idU])
  if (a.rows.length > 0) ROLES.push('administrador')

  var b = await sqlExec('SELECT id FROM Abogado WHERE id_usuario = $1', [idU])
  if (b.rows.length > 0) ROLES.push('abogado')

  var c = await sqlExec('SELECT id FROM Cliente WHERE id_usuario = $1', [idU])
  if (c.rows.length > 0) ROLES.push('cliente')

  return ROLES
}
