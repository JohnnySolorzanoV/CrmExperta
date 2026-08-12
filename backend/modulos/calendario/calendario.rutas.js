import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarMismoUsuario } from '../../config/autorizacion.js'
import { listarSlots, listarDisponibilidadAbogado, crearSlot, eliminarSlot } from './calendario.casosDeUso.js'

var router = Router()

// /abogado/:id devuelve la información completa del calendario (incluye la
// descripción). Solo el abogado propietario puede verla.
router.get('/abogado/:idUsuarioAbogado', verificarToken, verificarMismoUsuario(req => req.params.idUsuarioAbogado), async (req, res, next) => {
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

router.post('/', verificarToken, verificarRol('abogado'), async (req, res, next) => {
  try {
    var payload = { ...req.body }
    // El abogado solo puede crear horarios para sí mismo: si intenta asignar
    // un idAbogado ajeno se rechaza con 403 (no se sobreescribe en silencio).
    if (req.body.idAbogado != null && Number(req.body.idAbogado) !== Number(req.usuario.id)) {
      throw Object.assign(new Error('No tienes permiso para gestionar el calendario de otro abogado'), { status: 403 })
    }
    payload.idAbogado = req.usuario.id
    var s = await crearSlot(payload)
    res.status(201).json({ mensaje: 'Slot creado', slot: s })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarRol('abogado'), async (req, res, next) => {
  try {
    // El abogado solo puede eliminar sus propios horarios.
    await eliminarSlot(Number(req.params.id), req.usuario.id)
    res.json({ mensaje: 'Slot eliminado' })
  } catch (error) { next(error) }
})

export default router
