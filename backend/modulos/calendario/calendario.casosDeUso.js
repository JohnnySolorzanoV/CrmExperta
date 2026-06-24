import * as calRepo from './calendario.repositorio.js'
import { Calendario as Cal } from '../../entidades/calendario.js'
import { ejecutarConsulta } from '../../config/database.js'

export var listarSlots = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  return calRepo.obtenerPorAbogado(r.rows[0].id)
}

export var listarDisponibilidadAbogado = async (idUsuario) => {
  var r = await ejecutarConsulta('SELECT id FROM Abogado WHERE id_usuario = $1', [idUsuario])
  if (r.rows.length === 0) throw Object.assign(new Error('Abogado no encontrado'), { status: 404 })
  var pkAbogado = r.rows[0].id

  var disponiblesCalendario = await ejecutarConsulta(
    `SELECT cal.id, cal.fecha_evento as "fechaEvento", cal.descripcion
     FROM Calendario cal
     LEFT JOIN Cita c
       ON c.id_calendario = cal.id
      AND c.estado_cita != 'cancelada'
     WHERE cal.id_abogado = $1
       AND cal.fecha_evento >= NOW()
       AND c.id IS NULL
     ORDER BY cal.fecha_evento
     LIMIT 10`,
    [pkAbogado]
  )

  if (disponiblesCalendario.rows.length > 0) {
    return disponiblesCalendario.rows
  }

  // Fallback: generar siguientes 10 horarios disponibles aunque no existan slots en Calendario.
  var ocupadas = await ejecutarConsulta(
    `SELECT fecha_hora_copia as "fechaHora"
     FROM Cita
     WHERE id_abogado = $1
       AND estado_cita != 'cancelada'
       AND fecha_hora_copia >= NOW()`,
    [pkAbogado]
  )

  var ocupadasSet = new Set(
    ocupadas.rows.map(row => {
      var d = new Date(row.fechaHora)
      d.setMinutes(0, 0, 0)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00:00`
    })
  )

  var resultados = []
  var cursor = new Date()
  cursor.setMinutes(0, 0, 0)
  cursor.setHours(cursor.getHours() + 1)

  // Buscar disponibilidad de forma acotada (hasta 60 dias).
  var iteraciones = 0
  var maxIteraciones = 24 * 60
  while (resultados.length < 10 && iteraciones < maxIteraciones) {
    var dia = cursor.getDay() // 0 domingo, 6 sabado
    var hora = cursor.getHours()
    var esLaboral = dia >= 1 && dia <= 5 && hora >= 8 && hora <= 17
    var fechaLocal = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}T${String(cursor.getHours()).padStart(2, '0')}:00:00`

    if (esLaboral && !ocupadasSet.has(fechaLocal)) {
      resultados.push({
        id: null,
        fechaEvento: fechaLocal,
        descripcion: 'Horario sugerido'
      })
    }

    cursor.setHours(cursor.getHours() + 1)
    iteraciones += 1
  }

  return resultados
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
