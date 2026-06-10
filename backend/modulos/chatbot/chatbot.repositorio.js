import { ejecutarConsulta } from '../../config/database.js'
import { Chatbot } from '../../entidades/chatbot.js'

export async function obtenerHistorial(idUsuario) {
  var r = await ejecutarConsulta(
    `SELECT id, id_usuario as "idUsuario", chat_log as "chatLog", fecha
     FROM Chatbot WHERE id_usuario = $1 ORDER BY fecha DESC`,
    [idUsuario]
  )
  return r.rows.map(row => new Chatbot(row))
}

export async function crear(consulta) {
  var r = await ejecutarConsulta(
    `INSERT INTO Chatbot (id_usuario, chat_log)
     VALUES ($1, $2)
     RETURNING id, id_usuario as "idUsuario", chat_log as "chatLog", fecha`,
    [consulta.idUsuario, consulta.chatLog]
  )
  return new Chatbot(r.rows[0])
}
