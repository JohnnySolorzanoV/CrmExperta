import * as botRepo from './chatbot.repositorio.js'
import { Chatbot as Bot } from '../../entidades/chatbot.js'

export async function consultar({ idUsuario, mensaje }) {
  if (!mensaje) throw Object.assign(new Error('Mensaje requerido'), { status: 400 })

  var log = JSON.stringify({ pregunta: mensaje, respuesta: 'Pendiente de integrar' })
  console.log('chat consulta:', mensaje)

  var CONSULTA = new Bot({
    idUsuario: idUsuario || null,
    chatLog: log
  })

  return botRepo.crear(CONSULTA)
}

export var obtenerHistorial = async (idUsuario) => {
  if (!idUsuario) throw Object.assign(new Error('ID de usuario requerido'), { status: 400 })
  return botRepo.obtenerHistorial(idUsuario)
}
