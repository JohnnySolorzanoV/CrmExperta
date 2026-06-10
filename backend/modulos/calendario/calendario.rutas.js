import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { listarSlots, crearSlot, eliminarSlot } from './calendario.casosDeUso.js'

var router = Router()

router.get('/abogado/:idAbogado', verificarToken, async (req, res, next) => {
  try {
    var SLOTS = await listarSlots(Number(req.params.idAbogado))
    res.json({ slots: SLOTS })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var s = await crearSlot(req.body)
    res.status(201).json({ mensaje: 'Slot creado', slot: s })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var R = await eliminarSlot(Number(req.params.id))
    res.json(R)
  } catch (error) { next(error) }
})

export default router
