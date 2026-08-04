import { ejecutarConsulta, obtenerPool } from '../../config/database.js'
import { Usuario } from '../../entidades/usuario.js'

var SQL_USR = `SELECT id, identificacion, nombre, correo, contrasena, activo, fecha_registro as "fechaRegistro"`

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

// Alta de Usuario + Cliente dentro de una misma transacción: si falla cualquiera
// de los dos INSERT, se revierte todo (RF01, trazabilidad coherente).
export async function crearUsuarioConCliente(datos, direccion, telefono) {
  var pool = obtenerPool()
  var client = await pool.connect()
  try {
    await client.query('BEGIN')
    var r = await client.query(
      `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
       VALUES ($1, $2, $3, $4)
       RETURNING id, identificacion, nombre, correo, activo, fecha_registro as "fechaRegistro"`,
      [datos.identificacion, datos.nombre, datos.correo, datos.contrasena]
    )
    await client.query(
      `INSERT INTO Cliente (id_usuario, direccion, telefono) VALUES ($1, $2, $3)`,
      [r.rows[0].id, direccion || null, telefono || null]
    )
    await client.query('COMMIT')
    return new Usuario(r.rows[0])
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

// Consulta la lista de clientes (datos públicos + estado), unido a su usuario.
export async function obtenerClientes() {
  var r = await ejecutarConsulta(
    `SELECT u.id AS id, u.identificacion, u.nombre, u.correo, u.activo,
            c.direccion, c.telefono, u.fecha_registro as "fechaRegistro"
       FROM Cliente c
       JOIN Usuario u ON u.id = c.id_usuario
      ORDER BY u.nombre`
  )
  return r.rows
}

export async function obtenerClientePorUsuarioId(idUsuario) {
  var r = await ejecutarConsulta(
    `SELECT u.id, u.identificacion, u.nombre, u.correo, u.activo,
            c.direccion, c.telefono, u.fecha_registro as "fechaRegistro"
       FROM Cliente c
       JOIN Usuario u ON u.id = c.id_usuario
      WHERE u.id = $1`,
    [idUsuario]
  )
  return r.rows[0] || null
}

export async function actualizarDatosCliente(idUsuario, { nombre, correo, direccion, telefono }) {
  var r = await ejecutarConsulta(
    `UPDATE Usuario u SET
        nombre = COALESCE($2, u.nombre),
        correo = COALESCE($3, u.correo)
       FROM Cliente c
      WHERE c.id_usuario = u.id AND u.id = $1
      RETURNING c.id AS clienteId, u.id`,
    [idUsuario, nombre ?? null, correo ?? null]
  )
  if (r.rows.length === 0) return null
  await ejecutarConsulta(
    `UPDATE Cliente SET direccion = COALESCE($2, direccion), telefono = COALESCE($3, telefono) WHERE id_usuario = $1`,
    [idUsuario, direccion ?? null, telefono ?? null]
  )
  return r.rows[0]
}

export async function cambiarEstadoCliente(idUsuario, activo) {
  var r = await ejecutarConsulta(
    `UPDATE Usuario SET activo = $2 WHERE id = $1 RETURNING id`,
    [idUsuario, activo]
  )
  return r.rows.length > 0
}
