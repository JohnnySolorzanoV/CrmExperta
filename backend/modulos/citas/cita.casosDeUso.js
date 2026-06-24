import * as ctaRepo from './cita.repositorio.js'
import { Cita } from '../../entidades/cita.js'
import { ejecutarConsulta } from '../../config/database.js'

export async function listarCitas() {
  return ctaRepo.obtenerTodas()
}

export var obtenerCita = async (id) => {
  var c = await ctaRepo.buscarPorId(id)
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return c
}

export var listarCitasCliente = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  return ctaRepo.buscarPorCliente(r.rows[0].id)
}

export var listarCitasAbogado = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return ctaRepo.buscarPorAbogado(r.rows[0].id)
}

export async function agendarCita({ idCliente, idAbogado, fechaHoraCopia, idCalendario, motivo, resumenChatbot }) {
  if (!idCliente || !fechaHoraCopia) {
    throw Object.assign(new Error('Faltan datos requeridos para la cita'), { status: 400 })
  }

  if (!idAbogado) {
    throw Object.assign(new Error('Debes asignar un abogado para crear la cita'), { status: 400 })
  }

  // convertir Usuario.id a Cliente.id / Abogado.id
  var rCliente = await ejecutarConsulta('SELECT id FROM Cliente WHERE id_usuario = $1', [idCliente])
  if (rCliente.rows.length === 0) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  var pkCliente = rCliente.rows[0].id

  var rAbogado = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idAbogado])
  if (rAbogado.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var pkAbogado = rAbogado.rows[0].id

  if (idCalendario) {
    var ocupado = await ctaRepo.slotOcupado(idCalendario)
    if (ocupado) throw Object.assign(new Error('El horario ya esta reservado'), { status: 409 })
  }

  // si no se envio un slot de calendario, crear uno automaticamente
  if (!idCalendario) {
    var slotCreado = await ejecutarConsulta(
      `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, $3) RETURNING id`,
      [pkAbogado, fechaHoraCopia, 'Cita agendada: ' + (motivo || '')]
    )
    idCalendario = slotCreado.rows[0].id
  }

  var cita_nueva = new Cita({
    idCliente: pkCliente, idAbogado: pkAbogado, fechaHoraCopia, idCalendario,
    motivo, estadoCita: 'pendiente', resumenChatbot
  })

  return ctaRepo.crear(cita_nueva)
}

export var cancelarCita = async (id) => {
  var c = await ctaRepo.actualizarEstado(id, 'cancelada')
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return c
}

export var completarCita = async (id) => {
  var c = await ctaRepo.actualizarEstado(id, 'completada')
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return c
}

export var aceptarCita = async (id) => {
  var c = await ctaRepo.actualizarEstado(id, 'confirmada')
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return c
}

export async function reprogramarCita(id, fechaHoraCopia, idCalendario) {
  var existe = await ctaRepo.buscarPorId(id)
  if (!existe) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })

  if (idCalendario) {
    var ocupado = await ctaRepo.slotOcupado(idCalendario)
    if (ocupado) throw Object.assign(new Error('El nuevo horario ya esta reservado'), { status: 409 })
  }

  if (!idCalendario) {
    var r = await ejecutarConsulta(
      'SELECT id_abogado FROM Cita WHERE id = $1', [id]
    )
    var pkAbogado = r.rows[0].id_abogado
    var slotCreado = await ejecutarConsulta(
      `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, $3) RETURNING id`,
      [pkAbogado, fechaHoraCopia, 'Cita reprogramada']
    )
    idCalendario = slotCreado.rows[0].id
  }

  return ctaRepo.actualizarFecha(id, fechaHoraCopia, idCalendario)
}

export var eliminarCita = async (id) => {
  var r = await ctaRepo.eliminar(id)
  if (!r) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })
  return { mensaje: 'Cita eliminada' }
}
