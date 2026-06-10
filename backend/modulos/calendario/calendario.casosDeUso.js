import * as calRepo from './calendario.repositorio.js'
import { Calendario as Cal } from '../../entidades/calendario.js'
import { ejecutarConsulta } from '../../config/database.js'

export var listarSlots = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return calRepo.obtenerPorAbogado(r.rows[0].id)
}

export async function crearSlot({ idAbogado, fechaEvento, descripcion }) {
  if (!idAbogado || !fechaEvento) {
    throw Object.assign(new Error('Faltan datos del slot'), { status: 400 })
  }

  var r = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idAbogado])
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var pkAbogado = r.rows[0].id

  var SLOT = new Cal({
    idAbogado: pkAbogado,
    fechaEvento,
    descripcion: descripcion || ''
  })

  return calRepo.crear(SLOT)
}

export var eliminarSlot = async (id) => {
  var r = await calRepo.eliminar(id)
  if (!r) throw Object.assign(new Error('Slot no encontrado'), { status: 404 })
  return { mensaje: 'Slot eliminado' }
}
