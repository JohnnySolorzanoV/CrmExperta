import { Router } from 'express'
import { verificarToken } from '../../config/autenticacion.js'
import { consultar, obtenerHistorial } from './chatbot.casosDeUso.js'
import { agendarCita } from '../citas/cita.casosDeUso.js'

var router = Router()

router.post('/consultar', verificarToken, async (req, res, next) => {
  try {
    var { idUsuario, mensaje } = req.body
    var R = await consultar({ idUsuario, mensaje })
    res.json(R)
  } catch (error) { next(error) }
})

router.post('/agendar', verificarToken, async (req, res, next) => {
  try {
    // recibe el resumen generado por la AI y agenda la cita
    var { idCliente, idAbogado, resumen, tipoConsulta, motivo, fechaHoraCopia, idCalendario } = req.body
    if (!idCliente || !idAbogado || !resumen) {
      throw Object.assign(new Error('Faltan datos para agendar desde chat (cliente, abogado, resumen)'), { status: 400 })
    }

    // crear la cita
    var citaCreada = await agendarCita({
      idCliente,
      idAbogado,
      fechaHoraCopia: fechaHoraCopia || new Date(Date.now() + 86400000).toISOString(), // mañana por defecto
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

router.get('/historial/:idUsuario', verificarToken, async (req, res, next) => {
  try {
    var HIST = await obtenerHistorial(Number(req.params.idUsuario))
    res.json({ historial: HIST })
  } catch (error) { next(error) }
})

export default router
