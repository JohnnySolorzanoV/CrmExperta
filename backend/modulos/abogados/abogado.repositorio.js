import * as db from '../../config/database.js'
import { Abogado as Abg } from '../../entidades/abogado.js'

var SQL = `SELECT
            u.id,
            u.identificacion,
            u.nombre,
            u.correo,
            a.especialidad,
            a.num_licencia as "numLicencia", 
            u.fecha_registro as "fechaRegistro"
           FROM Usuario u 
           JOIN Abogado a ON a.id_usuario = u.id`

export async function obtenerTodos() {
  // lista los usuariis por nombre
  // solo abogados, no clientes ni admin
  var r = await db.ejecutarConsulta(`${SQL} ORDER BY u.nombre`)
  return r.rows.map(row => new Abg(row))
}

export async function buscarPorId(id) {
  var r = await db.ejecutarConsulta(`${SQL} WHERE u.id = $1`, [id])
  if (r.rows.length === 0) return null
  return new Abg(r.rows[0])
}

export async function buscarPorIdentificacion(identificacion) {
  var r = await db.ejecutarConsulta(`${SQL} WHERE u.identificacion = $1`, [identificacion])
  if (r.rows.length === 0) return null
  return new Abg(r.rows[0])
}

export async function buscarPorEspecialidad(esp) {
  var r = await db.ejecutarConsulta(
    `${SQL} WHERE LOWER(a.especialidad) LIKE LOWER($1)`,
    [`%${esp}%`] // esto busco texto que contenga la especialidad, sin importar mayúsculas o minúsculas,
  )
  return r.rows.map(row => new Abg(row))
}

export async function crear(datos) {
  var r1 = await db.ejecutarConsulta(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [datos.identificacion, datos.nombre, datos.correo, datos.contrasena]
  )
  var idU = r1.rows[0].id

  // ahora se crea el abogado con el id del usuario recién creado
  await db.ejecutarConsulta(
    `INSERT INTO Abogado (id_usuario, especialidad, num_licencia) VALUES ($1, $2, $3)`,
    [idU, datos.especialidad, datos.numLicencia]
  )

  return buscarPorId(idU)
}

export async function actualizar(id, datos) {
  var existe = await db.ejecutarConsulta('SELECT id_usuario FROM Abogado WHERE id_usuario = $1', [id])
  if (existe.rows.length === 0) return null

  await db.ejecutarConsulta('UPDATE Usuario SET nombre = $1, correo = $2 WHERE id = $3', [datos.nombre, datos.correo, id])
  await db.ejecutarConsulta('UPDATE Abogado SET especialidad = $1, num_licencia = $2 WHERE id_usuario = $3', [datos.especialidad, datos.numLicencia, id])

  return buscarPorId(id)
}

export async function eliminar(id) {
  var r = await db.ejecutarConsulta('DELETE FROM Usuario WHERE id = $1 RETURNING id', [id])
  return r.rowCount > 0
}

export async function obtenerDependenciasActivas(idUsuarioAbogado) {
  var abogado = await db.ejecutarConsulta(
    'SELECT id FROM Abogado WHERE id_usuario = $1',
    [idUsuarioAbogado]
  )

  if (abogado.rows.length === 0) {
    return null
  }

  var idAbogado = abogado.rows[0].id

  var totalCasos = await db.ejecutarConsulta(
    'SELECT COUNT(*)::int AS total FROM Caso WHERE id_abogado = $1',
    [idAbogado]
  )

  var totalCitasActivas = await db.ejecutarConsulta(
    `SELECT COUNT(*)::int AS total
     FROM Cita
     WHERE id_abogado = $1
       AND estado_cita NOT IN ('cancelada', 'completada')`,
    [idAbogado]
  )

  return {
    idAbogado,
    totalCasos: totalCasos.rows[0].total,
    totalCitasActivas: totalCitasActivas.rows[0].total,
  }
}

export async function eliminarCitasCerradas(idAbogado) {
  await db.ejecutarConsulta(
    `DELETE FROM Cita
     WHERE id_abogado = $1
       AND estado_cita IN ('cancelada', 'completada')`,
    [idAbogado]
  )
}
