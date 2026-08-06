import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarHistorialChatbot } from '../../config/autorizacion.js'
import { consultar, obtenerHistorial } from './chatbot.casosDeUso.js'
import { agendarCita } from '../citas/cita.casosDeUso.js'
import { OFFSET_GUAYAQUIL_UTC_HORAS } from '../../config/horarioInstitucional.js'

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

    // crear la cita
    var citaCreada = await agendarCita({
      idCliente,
      idAbogado,
      fechaHoraCopia: fechaHoraCopia || proximaFranjaLaborable(), // proximo dia laborable por defecto
      idCalendario,
      motivo: motivo || resumen.substring(0, 200),
      resumenChatbot: resumen
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
    res.json({ historial: HIST })
  } catch (error) { next(error) }
})

export default router
