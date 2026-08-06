import { ejecutarConsulta as sqlExec } from '../../config/database.js'
import { Usuario } from '../../entidades/usuario.js'

var CAMPOS_USUARIO = `id, identificacion, nombre, correo, fecha_registro as "fechaRegistro"`

function conClient(cnn) {
  return cnn ? (txt, prms) => cnn.query(txt, prms) : sqlExec
}

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

export async function actualizar(id, datos, cnn = null) {
  var q = conClient(cnn)
  var r = await q(
    `UPDATE Usuario SET nombre = $1, correo = $2 WHERE id = $3
     RETURNING ${CAMPOS_USUARIO}`,
    [datos.nombre, datos.correo, id]
  )
  if (r.rows.length === 0) return null
  return new Usuario(r.rows[0])
}

export async function eliminar(id, cnn = null) {
  var q = conClient(cnn)
  var r = await q('DELETE FROM Usuario WHERE id = $1 RETURNING id', [id])
  return r.rowCount > 0
}

export async function cambiarEstado(id, activo, cnn = null) {
  var q = conClient(cnn)
  var r = await q(
    `UPDATE Usuario SET activo = $2 WHERE id = $1
     RETURNING ${CAMPOS_USUARIO}`,
    [id, activo]
  )
  if (r.rows.length === 0) return null
  return new Usuario(r.rows[0])
}

export async function asignarRol(idU, rol, extra = {}, cnn = null) {
  var q = conClient(cnn)
  if (rol === 'administrador') {
    await q('INSERT INTO Administrador (id_usuario) VALUES ($1) ON CONFLICT DO NOTHING', [idU])
  } else if (rol === 'abogado') {
    await q(
      'INSERT INTO Abogado (id_usuario, num_licencia, especialidad) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [idU, extra.numLicencia, extra.especialidad]
    )
  } else if (rol === 'cliente') {
    await q('INSERT INTO Cliente (id_usuario) VALUES ($1) ON CONFLICT DO NOTHING', [idU])
  }
}

export async function quitarRol(idU, rol, cnn = null) {
  var q = conClient(cnn)
  if (rol === 'administrador') {
    await q('DELETE FROM Administrador WHERE id_usuario = $1', [idU])
  } else if (rol === 'abogado') {
    await q('DELETE FROM Abogado WHERE id_usuario = $1', [idU])
  } else if (rol === 'cliente') {
    await q('DELETE FROM Cliente WHERE id_usuario = $1', [idU])
  }
}

export async function obtenerRoles(idU, cnn = null) {
  var q = conClient(cnn)
  var ROLES = []

  var a = await q('SELECT id FROM Administrador WHERE id_usuario = $1', [idU])
  if (a.rows.length > 0) ROLES.push('administrador')

  var b = await q('SELECT id FROM Abogado WHERE id_usuario = $1', [idU])
  if (b.rows.length > 0) ROLES.push('abogado')

  var c = await q('SELECT id FROM Cliente WHERE id_usuario = $1', [idU])
  if (c.rows.length > 0) ROLES.push('cliente')

  return ROLES
}
