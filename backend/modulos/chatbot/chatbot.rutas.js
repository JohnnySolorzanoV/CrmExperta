import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarHistorialChatbot } from '../../config/autorizacion.js'
import { consultar, obtenerHistorial, FALLO_EXTERNO } from './chatbot.casosDeUso.js'
import { agendarCita } from '../citas/cita.casosDeUso.js'
import { registrarAuditoria, truncarTexto } from '../auditoria/auditoria.servicio.js'
import { OFFSET_GUAYAQUIL_UTC_HORAS } from '../../config/horarioInstitucional.js'
import { log } from '../../config/logger.js'

var router = Router()

function proximaFranjaLaborable() {
  var d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(10 + OFFSET_GUAYAQUIL_UTC_HORAS, 0, 0, 0)
  return d.toISOString()
}

router.post('/consultar', verificarToken, async (req, res, next) => {
  try {
    // El historial/contexto siempre corresponde al usuario autenticado.
    var mensaje = req.body?.mensaje
    var R = await consultar({ idUsuario: req.usuario.id, mensaje })
    var respEstado = R.respuesta === FALLO_EXTERNO ? 'fallo_externo' : 'ok'
    var agendar = R.agendar ? 'si' : 'no'
    await registrarAuditoria({
      req,
      accion: 'CONSULTAR',
      recurso: 'Chatbot',
      recursoId: R.consultaId,
      detalle: 'pregunta: ' + truncarTexto(mensaje) + ' | respuesta: ' + respEstado + ' | agendar: ' + agendar
    }).catch(e => log.error('AUDITORIA_ERR', { err: e.message, contexto: 'consulta chatbot' }))
    res.json(R)
  } catch (error) { next(error) }
})

router.post('/agendar', verificarToken, verificarRol('cliente'), async (req, res, next) => {
  try {
    // recibe el resumen generado por la AI y agenda la cita
    var { idAbogado, resumen, motivo, fechaHoraCopia, idCalendario } = req.body
    if (!idAbogado || !resumen) {
      throw Object.assign(new Error('Faltan datos para agendar desde chat (abogado, resumen)'), { status: 400 })
    }

    // El cliente solo agenda para sí mismo.
    var idCliente = req.usuario.id

    var citaCreada = await agendarCita({
      idCliente,
      idAbogado,
      fechaHoraCopia: fechaHoraCopia || proximaFranjaLaborable(),
      idCalendario,
      motivo: motivo || resumen.substring(0, 200),
      resumenChatbot: resumen
    }, {
      req,
      accion: 'CREAR',
      recurso: 'Cita',
      detalle: 'agendamiento de cita desde chatbot'
    })

    res.status(201).json({
      mensaje: 'Cita agendada desde chat',
      cita: citaCreada,
      resumen
    })
  } catch (error) { next(error) }
})

router.get('/historial/:idUsuario', verificarToken, verificarHistorialChatbot, async (req, res, next) => {
  try {
    var HIST = await obtenerHistorial(Number(req.params.idUsuario))
    await registrarAuditoria({
      req,
      accion: 'LEER',
      recurso: 'Chatbot',
      recursoId: Number(req.params.idUsuario),
      detalle: 'consulta de historial de chatbot'
    }).catch(e => log.error('AUDITORIA_ERR', { err: e.message, contexto: 'historial chatbot' }))
    res.json({ historial: HIST })
  } catch (error) { next(error) }
})

export default router
