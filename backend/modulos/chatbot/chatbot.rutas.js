import { Router } from 'express'
import { verificarToken } from '../../config/autenticacion.js'
import { consultar, obtenerHistorial } from './chatbot.casosDeUso.js'

var router = Router()

router.post('/consultar', verificarToken, async (req, res, next) => {
  try {
    var { idUsuario, mensaje } = req.body
    var R = await consultar({ idUsuario, mensaje })
    res.json({ consulta: R })
  } catch (error) { next(error) }
})

router.get('/historial/:idUsuario', verificarToken, async (req, res, next) => {
  try {
    var HIST = await obtenerHistorial(Number(req.params.idUsuario))
    res.json({ historial: HIST })
  } catch (error) { next(error) }
})

export default router
