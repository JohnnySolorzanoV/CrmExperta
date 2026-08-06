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

export var crearAbogado = async (datos, cnn = null) => {
  if (!datos.especialidad || !datos.numLicencia) {
    throw Object.assign(new Error('Faltan datos del abogado (especialidad, numLicencia)'), { status: 400 })
  }

  var q = cnn ? (txt, prms) => cnn.query(txt, prms) : ejecutarConsulta
  var existeMail = await q('SELECT id FROM Usuario WHERE correo = $1', [datos.correo])
  if (existeMail.rows.length > 0) {
    throw Object.assign(new Error('El correo ya esta registrado'), { status: 400 })
  }

  var existeIdent = await q('SELECT id FROM Usuario WHERE identificacion = $1', [datos.identificacion])
  if (existeIdent.rows.length > 0) {
    throw Object.assign(new Error('La identificacion ya esta registrada'), { status: 400 })
  }

  var existeLicencia = await q('SELECT id FROM Abogado WHERE num_licencia = $1', [datos.numLicencia])
  if (existeLicencia.rows.length > 0) {
    throw Object.assign(new Error('La licencia profesional ya esta registrada'), { status: 409 })
  }

  var contraHash = await hashPass(datos.contrasena, 10)

  return abgRepo.crear({
    identificacion: datos.identificacion,
    nombre: datos.nombre,
    correo: datos.correo,
    contrasena: contraHash,
    especialidad: datos.especialidad,
    numLicencia: datos.numLicencia
  }, cnn)
}

export async function actualizarAbogado(id, datos, cnn = null) {
  var a = await abgRepo.actualizar(id, datos, cnn)
  if (!a) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return a
}

export var eliminarAbogado = async (id, cnn = null) => {
  var deps = await abgRepo.obtenerDependenciasActivas(id)
  if (!deps) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })

  if (deps.totalCasos > 0) {
    throw Object.assign(
      new Error('No se puede eliminar el abogado porque tiene casos asignados'),
      { status: 409 }
    )
  }

  if (deps.totalCitasActivas > 0) {
    throw Object.assign(
      new Error('No se puede eliminar el abogado porque tiene citas activas programadas'),
      { status: 409 }
    )
  }

  var r
  try {
    await abgRepo.eliminarCitasCerradas(deps.idAbogado, cnn)
    r = await abgRepo.eliminar(id, cnn)
  } catch (error) {
    if (error?.code === '23503') {
      throw Object.assign(
        new Error('No se puede eliminar el abogado porque tiene dependencias activas'),
        { status: 409 }
      )
    }
    throw error
  }

  if (!r) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return { mensaje: 'Abogado eliminado' }
}
