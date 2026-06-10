import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import {
  listarCitas, obtenerCita, listarCitasCliente, listarCitasAbogado,
  agendarCita, cancelarCita, completarCita, reprogramarCita, eliminarCita
} from './cita.casosDeUso.js'

var router = Router()

router.get('/', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var CITAS = await listarCitas()
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, async (req, res, next) => {
  try {
    var c = await obtenerCita(Number(req.params.id))
    res.json({ cita: c })
  } catch (error) { next(error) }
})

router.get('/cliente/:idCliente', verificarToken, async (req, res, next) => {
  try {
    var CITAS = await listarCitasCliente(Number(req.params.idCliente))
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.get('/abogado/:idAbogado', verificarToken, async (req, res, next) => {
  try {
    var CITAS = await listarCitasAbogado(Number(req.params.idAbogado))
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('cliente', 'administrador'), async (req, res, next) => {
  try {
    var c = await agendarCita(req.body)
    res.status(201).json({ mensaje: 'Cita agendada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/cancelar', verificarToken, async (req, res, next) => {
  try {
    var c = await cancelarCita(Number(req.params.id))
    res.json({ mensaje: 'Cita cancelada', cita: c })
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
