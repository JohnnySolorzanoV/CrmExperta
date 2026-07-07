import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { listarSlots, listarDisponibilidadAbogado, crearSlot, eliminarSlot } from './calendario.casosDeUso.js'

var router = Router()

router.get('/abogado/:idUsuarioAbogado', verificarToken, async (req, res, next) => {
  try {
    var idUsuarioAbogado = Number(req.params.idUsuarioAbogado)
    if (!Number.isFinite(idUsuarioAbogado)) {
      throw Object.assign(new Error('Parametro idUsuarioAbogado invalido'), { status: 400 })
    }
    var SLOTS = await listarSlots(idUsuarioAbogado)
    res.json({ slots: SLOTS })
  } catch (error) { next(error) }
})

router.get('/abogado/:idUsuarioAbogado/disponibilidad', verificarToken, async (req, res, next) => {
  try {
    var idUsuarioAbogado = Number(req.params.idUsuarioAbogado)
    if (!Number.isFinite(idUsuarioAbogado)) {
      throw Object.assign(new Error('Parametro idUsuarioAbogado invalido'), { status: 400 })
    }
    var DISPONIBLES = await listarDisponibilidadAbogado(idUsuarioAbogado)
    res.json({ disponibilidad: DISPONIBLES })
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
