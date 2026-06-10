import { hash as hashPass } from 'bcrypt'
import * as abgRepo from './abogado.repositorio.js'
import { ejecutarConsulta } from '../../config/database.js'

export var listarAbogados = async () => abgRepo.obtenerTodos()

export async function obtenerAbogado(id) {
  var a = await abgRepo.buscarPorId(id)
  if (!a) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return a
}

export async function buscarPorEspecialidad(especialidad) {
  if (!especialidad) throw Object.assign(new Error('Especialidad requerida'), { status: 400 })
  return abgRepo.buscarPorEspecialidad(especialidad)
}

export var crearAbogado = async (datos) => {
  if (!datos.especialidad || !datos.numLicencia) {
    throw Object.assign(new Error('Faltan datos del abogado (especialidad, numLicencia)'), { status: 400 })
  }

  var existeMail = await ejecutarConsulta('SELECT id FROM Usuario WHERE correo = $1', [datos.correo])
  if (existeMail.rows.length > 0) {
    throw Object.assign(new Error('El correo ya esta registrado'), { status: 400 })
  }

  var existeIdent = await ejecutarConsulta('SELECT id FROM Usuario WHERE identificacion = $1', [datos.identificacion])
  if (existeIdent.rows.length > 0) {
    throw Object.assign(new Error('La identificacion ya esta registrada'), { status: 400 })
  }

  var contraHash = await hashPass(datos.contrasena, 10)
  console.log('creando abogado:', datos.nombre)

  return abgRepo.crear({
    identificacion: datos.identificacion,
    nombre: datos.nombre,
    correo: datos.correo,
    contrasena: contraHash,
    especialidad: datos.especialidad,
    numLicencia: datos.numLicencia
  })
}

export async function actualizarAbogado(id, datos) {
  var a = await abgRepo.actualizar(id, datos)
  if (!a) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return a
}

export var eliminarAbogado = async (id) => {
  var r = await abgRepo.eliminar(id)
  if (!r) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return { mensaje: 'Abogado eliminado' }
}
