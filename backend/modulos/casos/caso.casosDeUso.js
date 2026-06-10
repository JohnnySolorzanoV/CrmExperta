import * as casoRepo from './caso.repositorio.js'
import { Caso } from '../../entidades/caso.js'
import { ejecutarConsulta } from '../../config/database.js'

export var listarCasos = async () => casoRepo.obtenerTodos()

export async function obtenerCaso(id) {
  var c = await casoRepo.buscarPorId(id)
  if (!c) throw Object.assign(new Error('Caso no encontrado'), { status: 404 })
  return c
}

export var listarCasosCliente = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  return casoRepo.buscarPorCliente(r.rows[0].id)
}

export var listarCasosAbogado = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return casoRepo.buscarPorAbogado(r.rows[0].id)
}

export async function crearCaso({ estadoCaso, tipoCaso, nombreCaso, idCliente, idAbogado }) {
  if (!tipoCaso || !nombreCaso || !idCliente || !idAbogado) {
    throw Object.assign(new Error('Faltan datos del caso'), { status: 400 })
  }

  var rCliente = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idCliente])
  if (rCliente.rows.length === 0) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  var pkCliente = rCliente.rows[0].id

  var rAbogado = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idAbogado])
  if (rAbogado.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var pkAbogado = rAbogado.rows[0].id

  var CASO_NUEVO = new Caso({
    estadoCaso: estadoCaso || 'abierto',
    tipoCaso, nombreCaso, idCliente: pkCliente, idAbogado: pkAbogado
  })

  console.log('creando caso:', nombreCaso)
  return casoRepo.crear(CASO_NUEVO)
}

export async function actualizarEstadoCaso(id, estado) {
  var VALID_STATES = ['abierto', 'en_proceso', 'cerrado', 'archivado']
  if (!VALID_STATES.includes(estado)) {
    throw Object.assign(new Error('Estado invalido'), { status: 400 })
  }

  var actualizado = await casoRepo.actualizarEstado(id, estado)
  if (!actualizado) throw Object.assign(new Error('Caso no encontrado'), { status: 404 })
  return actualizado
}
