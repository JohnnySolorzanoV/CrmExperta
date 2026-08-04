import { Router } from 'express'
import { verificarToken } from '../../config/autenticacion.js'
import { verificarMismoUsuarioOTarget } from '../../config/autorizacion.js'
import { consultar, obtenerHistorial } from './chatbot.casosDeUso.js'
import { agendarCita } from '../citas/cita.casosDeUso.js'

var router = Router()

function proximaFranjaLaborable() {
  var d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
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

router.post('/agendar', verificarToken, async (req, res, next) => {
  try {
    // recibe el resumen generado por la AI y agenda la cita
    var { idCliente, idAbogado, resumen, tipoConsulta, motivo, fechaHoraCopia, idCalendario } = req.body
    if (!idAbogado || !resumen) {
      throw Object.assign(new Error('Faltan datos para agendar desde chat (abogado, resumen)'), { status: 400 })
    }

    // Un cliente solo puede agendar para sí mismo; el administrador decide su target.
    var esAdmin = Array.isArray(req.usuario.roles) && req.usuario.roles.includes('administrador')
    if (esAdmin) {
      if (!idCliente) throw Object.assign(new Error('Falta el cliente al agendar desde chat'), { status: 400 })
    } else {
      idCliente = req.usuario.id
    }

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

router.get('/historial/:idUsuario', verificarToken, verificarMismoUsuarioOTarget(req => req.params.idUsuario), async (req, res, next) => {
  try {
    var HIST = await obtenerHistorial(Number(req.params.idUsuario))
    res.json({ historial: HIST })
  } catch (error) { next(error) }
})

export default router
