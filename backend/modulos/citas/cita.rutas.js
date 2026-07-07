import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import {
  listarCitas, obtenerCita, listarCitasCliente, listarCitasAbogado,
  agendarCita, cancelarCita, aceptarCita, completarCita, reprogramarCita, eliminarCita
} from './cita.casosDeUso.js'

var router = Router()

router.get('/', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var CITAS = await listarCitas()
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.get('/cliente/:idUsuarioCliente', verificarToken, async (req, res, next) => {
  try {
    var idUsuarioCliente = Number(req.params.idUsuarioCliente)
    if (!Number.isFinite(idUsuarioCliente)) {
      throw Object.assign(new Error('Parametro idUsuarioCliente invalido'), { status: 400 })
    }
    var CITAS = await listarCitasCliente(idUsuarioCliente)
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.get('/abogado/:idUsuarioAbogado', verificarToken, async (req, res, next) => {
  try {
    var idUsuarioAbogado = Number(req.params.idUsuarioAbogado)
    if (!Number.isFinite(idUsuarioAbogado)) {
      throw Object.assign(new Error('Parametro idUsuarioAbogado invalido'), { status: 400 })
    }
    var CITAS = await listarCitasAbogado(idUsuarioAbogado)
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, async (req, res, next) => {
  try {
    var c = await obtenerCita(Number(req.params.id))
    res.json({ cita: c })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('cliente', 'administrador'), async (req, res, next) => {
  try {
    if (!req.body?.idAbogado) {
      throw Object.assign(new Error('Debes asignar un abogado antes de crear la cita'), { status: 400 })
    }
    var c = await agendarCita(req.body)
    res.status(201).json({ mensaje: 'Cita agendada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/cancelar', verificarToken, async (req, res, next) => {
  try {
    var { motivoCancelacion, canceladoPor } = req.body || {}
    var c = await cancelarCita(Number(req.params.id), { motivoCancelacion, canceladoPor })
    res.json({ mensaje: 'Cita cancelada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/aceptar', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var c = await aceptarCita(Number(req.params.id))
    res.json({ mensaje: 'Cita aceptada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/completar', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var c = await completarCita(Number(req.params.id))
    res.json({ mensaje: 'Cita marcada como cumplida', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/reprogramar', verificarToken, async (req, res, next) => {
  try {
    var { fechaHoraCopia, idCalendario } = req.body
    var c = await reprogramarCita(Number(req.params.id), fechaHoraCopia, idCalendario)
    res.json({ mensaje: 'Cita reprogramada', cita: c })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, async (req, res, next) => {
  try {
    var R = await eliminarCita(Number(req.params.id))
    res.json(R)
  } catch (error) { next(error) }
})

export default router
