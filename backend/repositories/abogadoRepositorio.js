import { Abogado } from '../entities';
import { ejecutarSQL } from '../external_integrations';

export async function buscarPorId(id) {
  const resultado = await ejecutarSQL(
    `SELECT a.id, u.identificacion, u.nombre, u.correo, u.contrasena, a.especialidad, a.num_licencia as "numLicencia"
     FROM abogado a 
     JOIN Usuario u ON a.id_usuario = u.id 
     WHERE a.id = ${id}`
  );
  if (resultado.rows.length === 0) return null;
  return new Abogado(resultado.rows[0]);
}

export async function obtenerTodos() {
  const resultado = await ejecutarSQL(
    `SELECT a.id, u.identificacion, u.nombre, u.correo, u.contrasena, a.especialidad, a.num_licencia as "numLicencia"
     FROM abogado a 
     JOIN Usuario u ON a.id_usuario = u.id`
  );
  return resultado.rows.map(row => new Abogado(row));
}

// buscar por especialidad - util para filtrar
export async function buscarPorEspecialidad(especialidad) {
  const resultado = await ejecutarSQL(
    `SELECT a.id, u.identificacion, u.nombre, u.correo, a.especialidad, a.num_licencia as "numLicencia"
     FROM abogado a 
     JOIN Usuario u ON a.id_usuario = u.id 
     WHERE a.especialidad ILIKE %${especialidad}%`
  );
  return resultado.rows.map(row => new Abogado(row));
}

export async function crear(abogado) {
  // primero crear el usuario
  const usuarioRes = await ejecutarSQL(
    `INSERT INTO Usuario (           identificacion,              nombre,              correo,              contrasena,       rol) 
                  VALUES (${abogado.identificacion}, '${abogado.nombre}', '${abogado.correo}', '${abogado.contrasena}', 'abogado');
    RETURNING id;`
  );

  // luego crear el abogado
  const abogadoRes = await ejecutarSQL(
    `INSERT INTO abogado (              id_usuario,              especialidad,             num_licencia) 
                  VALUES (${usuarioRes.rows[0].id}, '${abogado.especialidad}', '${abogado.numLicencia}');
    RETURNING *;`
  );

  return new Abogado({
    id: abogadoRes.rows[0].id,
    identificacion: abogado.identificacion,
    nombre: abogado.nombre,
    correo: abogado.correo,
    contrasena: abogado.contrasena,
    especialidad: abogado.especialidad,
    numLicencia: abogado.numLicencia
  });
}

export async function actualizar(abogado) {
  // buscar id_usuario primero
  const existente = await ejecutarSQL(
    `SELECT id_usuario 
     FROM abogado 
     WHERE id = ${abogado.id}`
  );

  if (!existente.rows[0]) return null;

  await ejecutarSQL(
    `UPDATE Usuario 
    SET identificacion = '${abogado.identificacion}', 
    nombre = '${abogado.nombre}', 
    correo = '${abogado.correo}', 
    contrasena = '${abogado.contrasena}' 
    WHERE id = ${existente.rows[0].id_usuario}`
  );

  const resultado = await ejecutarSQL(
    `UPDATE abogado 
    SET especialidad = '${abogado.especialidad}', 
    num_licencia = '${abogado.numLicencia}' 
    WHERE id = ${abogado.id};
    RETURNING *;`
  );

  return resultado.rows[0] ? new Abogado({ ...abogado, ...resultado.rows[0] }) : null;
}

export async function eliminarPorId(id) {
  // TODO: eliminar tambien el usuario asociado?
  const resultado = await ejecutarSQL(
    `DELETE FROM abogado 
     WHERE id = ${id};
     RETURNING *;`
  );
  return resultado.rowCount > 0;
}

export default {
  buscarPorId,
  obtenerTodos,
  buscarPorEspecialidad,
  crear,
  actualizar,
  eliminarPorId
};
