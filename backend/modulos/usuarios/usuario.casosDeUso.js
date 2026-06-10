import bcrypt from 'bcrypt'
import * as usrRepo from './usuario.repositorio.js'

export async function crearUsuario(datos) {
  var hash = await bcrypt.hash(datos.contrasena, 10)
  var creado = await usrRepo.crear({
    identificacion: datos.identificacion,
    nombre: datos.nombre,
    correo: datos.correo,
    contrasena: hash
  })
  creado.roles = []
  return creado
}

export var listarUsuarios = async () => {
  var users = await usrRepo.obtenerTodos()
  for (var u of users) {
    u.roles = await usrRepo.obtenerRoles(u.id)
  }
  return users
}

export async function obtenerUsuario(id) {
  var u = await usrRepo.buscarPorId(id)
  if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })
  u.roles = await usrRepo.obtenerRoles(u.id)
  return u
}

export async function actualizarUsuario(id, datos) {
  var existe = await usrRepo.buscarPorId(id)
  if (!existe) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })

  var act = await usrRepo.actualizar(id, datos)
  act.roles = await usrRepo.obtenerRoles(id)
  return act
}

export var eliminarUsuario = async (id) => {
  var r = await usrRepo.eliminar(id)
  if (!r) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })
  return { mensaje: 'Usuario eliminado' }
}

export async function agregarRol(id, rol, extra = {}) {
  var existe = await usrRepo.buscarPorId(id)
  if (!existe) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })

  var roles_validos = ['administrador', 'abogado', 'cliente']
  if (!roles_validos.includes(rol)) {
    throw Object.assign(new Error(`Rol invalido: ${rol}`), { status: 400 })
  }

  if (rol === 'abogado' && (!extra.numLicencia || !extra.especialidad)) {
    throw Object.assign(new Error('Faltan numLicencia y especialidad'), { status: 400 })
  }

  await usrRepo.asignarRol(id, rol, extra)

  var ROLES_RES = await usrRepo.obtenerRoles(id)
  return { mensaje: `Rol ${rol} asignado`, roles: ROLES_RES }
}

export async function removerRol(id, rol) {
  var existe = await usrRepo.buscarPorId(id)
  if (!existe) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })

  await usrRepo.quitarRol(id, rol)

  var ROLES_RES = await usrRepo.obtenerRoles(id)
  return { mensaje: `Rol ${rol} removido`, roles: ROLES_RES }
}
