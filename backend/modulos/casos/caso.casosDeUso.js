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

async function resolverClientePk(idCliente) {
  var porUsuario = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idCliente])
  if (porUsuario.rows.length > 0) return porUsuario.rows[0].id

  var porPk = await ejecutarConsulta('SELECT id FROM Cliente WHERE id = $1', [idCliente])
  if (porPk.rows.length > 0) return porPk.rows[0].id

  return null
}

async function resolverAbogadoPk(idAbogado) {
  var porUsuario = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idAbogado])
  if (porUsuario.rows.length > 0) return porUsuario.rows[0].id

  var porPk = await ejecutarConsulta('SELECT id FROM Abogado WHERE id = $1', [idAbogado])
  if (porPk.rows.length > 0) return porPk.rows[0].id

  return null
}

function normalizarTextoOpcional(valor) {
  if (valor === undefined || valor === null) return ''
  if (typeof valor !== 'string') throw Object.assign(new Error('Notas y conclusiones deben ser texto'), { status: 400 })
  return valor.trim()
}

export async function crearCaso({ estadoCaso, tipoCaso, nombreCaso, notas, conclusiones, idCliente, idAbogado }) {
  if (!tipoCaso || !nombreCaso || !idCliente || !idAbogado) {
    throw Object.assign(new Error('Faltan datos del caso'), { status: 400 })
  }

  var pkCliente = await resolverClientePk(idCliente)
  if (!pkCliente) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })

  var pkAbogado = await resolverAbogadoPk(idAbogado)
  if (!pkAbogado) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })

  var CASO_NUEVO = new Caso({
    estadoCaso: estadoCaso || 'abierto',
    tipoCaso,
    nombreCaso,
    notas: normalizarTextoOpcional(notas),
    conclusiones: normalizarTextoOpcional(conclusiones),
    idCliente: pkCliente,
    idAbogado: pkAbogado
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

export async function actualizarNotasConclusionesCaso(id, { notas, conclusiones }) {
  var notasNormalizadas = normalizarTextoOpcional(notas)
  var conclusionesNormalizadas = normalizarTextoOpcional(conclusiones)
  var actualizado = await casoRepo.actualizarNotasConclusiones(id, notasNormalizadas, conclusionesNormalizadas)
  if (!actualizado) throw Object.assign(new Error('Caso no encontrado'), { status: 404 })
  return actualizado
}
