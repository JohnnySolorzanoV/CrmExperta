import * as botRepo from './chatbot.repositorio.js'
import { Chatbot as Bot } from '../../entidades/chatbot.js'
import { ejecutarConsulta } from '../../config/database.js'
import { preguntarAI } from '../../config/poe.js'
import { agendarCita } from '../citas/cita.casosDeUso.js'

var SISTEMA_BASE = `
Eres un asistente legal especializado que trabaja para un bufete de abogados.
Tu funcion es ayudar a clientes con consultas legales generales, responder preguntas frecuentes,
y al final de la conversacion generar un resumen para agendar una cita con un abogado.

REGLAS IMPORTANTES:
1. Responde de forma clara y profesional, pero en lenguaje sencillo.
2. Si te preguntan algo que no sabes, indica que un abogado lo resolvera en la cita.
3. NO des asesoria legal definitiva ni garantices resultados.
4. Siempre recuerda que eres un asistente preliminar, no un abogado real.
5. Al final de la conversacion, cuando el usuario indique que ya termino o quiera agendar,
   responde UNICAMENTE con un JSON con este formato exacto:
   {"accion":"agendar","resumen":"...resumen de la consulta...","tipoConsulta":"...tipo...","motivo":"...motivo..."}
6. Solo usa el JSON cuando el usuario pida agendar o termine la consulta.
   En conversacion normal responde con texto natural.

PREGUNTAS FRECUENTES:
- ¿Cuanto dura una consulta inicial? Aproximadamente 30-45 minutos.
- ¿Que documentos necesito llevar? Identificacion oficial y cualquier documento relacionado al caso.
- ¿Cuales son los costos? La consulta inicial es gratuita. Los costos posteriores se acuerdan con el abogado.
- ¿Que tipos de casos atienden? Ofrecemos servicios en las siguientes áreas: defensa familiar, derecho constitucional, derecho civil, leyes de transito y derecho sucesorio.
`

async function obtenerContextoCRM(idUsuario) {
  var partes = []

  // datos del usuario
  var usr = await ejecutarConsulta(
    'SELECT id, nombre, correo FROM Usuario WHERE id = $1', [idUsuario]
  )
  if (usr.rows.length > 0) {
    partes.push('Usuario: ' + usr.rows[0].nombre + ' (' + usr.rows[0].correo + ')')
  }

  // ver si es cliente
  var cliente = await ejecutarConsulta(
    'SELECT id FROM Cliente WHERE id_usuario = $1', [idUsuario]
  )
  if (cliente.rows.length > 0) {
    partes.push('Rol: Cliente')

    // casos del cliente
    var casos = await ejecutarConsulta(
      `SELECT nombre_caso as "nombreCaso", tipo_caso as "tipoCaso", estado_caso as "estadoCaso"
       FROM Caso WHERE id_cliente = $1 ORDER BY fecha_apertura DESC LIMIT 3`,
      [cliente.rows[0].id]
    )
    if (casos.rows.length > 0) {
      partes.push('Casos activos del cliente:')
      for (var cs of casos.rows) {
        partes.push('- ' + cs.nombreCaso + ' (' + cs.tipoCaso + ') - ' + cs.estadoCaso)
      }
    }
  }

  // ver si es abogado
  var abogado = await ejecutarConsulta(
    'SELECT id, especialidad FROM Abogado WHERE id_usuario = $1', [idUsuario]
  )
  if (abogado.rows.length > 0) {
    partes.push('Rol: Abogado - Especialidad: ' + abogado.rows[0].especialidad)
  }

  return partes.join('\n')
}

function construirMensajes(historial, contextoCRM, mensajeNuevo) {
  var mensajes = [
    { role: 'system', content: SISTEMA_BASE + '\n\nCONTEXTO DEL USUARIO:\n' + contextoCRM }
  ]

  // agregar historial previo (pares de pregunta-respuesta)
  for (var entrada of historial) {
    try {
      var log = JSON.parse(entrada.chatLog)
      if (log.pregunta) {
        mensajes.push({ role: 'user', content: log.pregunta })
      }
      if (log.respuesta && log.respuesta !== '...') {
        mensajes.push({ role: 'assistant', content: log.respuesta })
      }
    } catch (e) {
      // ignorar entradas mal formateadas
    }
  }

  // agregar el mensaje nuevo del usuario
  mensajes.push({ role: 'user', content: mensajeNuevo })

  return mensajes
}

export async function consultar({ idUsuario, mensaje }) {
  if (!mensaje) throw Object.assign(new Error('Mensaje requerido'), { status: 400 })

  console.log('chat consulta:', mensaje, 'usuario:', idUsuario)

  // 1. obtener historial previo del usuario
  var historial = []
  if (idUsuario) {
    historial = await botRepo.obtenerHistorial(idUsuario)
  }

  // 2. obtener contexto del CRM
  var contextoCRM = ''
  if (idUsuario) {
    contextoCRM = await obtenerContextoCRM(idUsuario)
  }

  // 3. construir mensajes para la API
  var listaMensajes = construirMensajes(historial, contextoCRM, mensaje)

  // 4. guardar la pregunta del usuario inmediatamente
  var logParcial = JSON.stringify({ pregunta: mensaje, respuesta: '...' })
  var consultaGuardada = await botRepo.crear(new Bot({
    idUsuario: idUsuario || null,
    chatLog: logParcial
  }))

  // 5. llamar a la API de Poe
  var respuestaAI = await preguntarAI(listaMensajes)
  console.log('respuesta AI:', respuestaAI.substring(0, 100) + '...')

  // 6. actualizar el registro con la respuesta
  var logCompleto = JSON.stringify({ pregunta: mensaje, respuesta: respuestaAI })
  await botRepo.actualizarLog(consultaGuardada.id, logCompleto)

  // 7. detectar si la AI quiere agendar una cita (JSON de accion)
  var resultadoAgendar = null
  try {
    var parsed = JSON.parse(respuestaAI)
    if (parsed.accion === 'agendar' && parsed.resumen) {
      resultadoAgendar = parsed
    }
  } catch (e) {
    // no es JSON, es texto normal
  }

  return {
    respuesta: respuestaAI,
    consultaId: consultaGuardada.id,
    agendar: resultadoAgendar
  }
}

export var obtenerHistorial = async (idUsuario) => {
  if (!idUsuario) throw Object.assign(new Error('ID de usuario requerido'), { status: 400 })
  return botRepo.obtenerHistorial(idUsuario)
}
