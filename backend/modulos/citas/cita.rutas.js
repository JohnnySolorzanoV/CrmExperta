import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarDuenoCita, verificarMismoUsuarioOTarget } from '../../config/autorizacion.js'
import { registrarAuditoria } from '../auditoria/auditoria.servicio.js'
import { log } from '../../config/logger.js'
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

router.get('/cliente/:idUsuarioCliente', verificarToken, verificarMismoUsuarioOTarget(req => req.params.idUsuarioCliente), async (req, res, next) => {
  try {
    var idUsuarioCliente = Number(req.params.idUsuarioCliente)
    if (!Number.isFinite(idUsuarioCliente)) {
      throw Object.assign(new Error('Parametro idUsuarioCliente invalido'), { status: 400 })
    }
    var CITAS = await listarCitasCliente(idUsuarioCliente)
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.get('/abogado/:idUsuarioAbogado', verificarToken, verificarMismoUsuarioOTarget(req => req.params.idUsuarioAbogado), async (req, res, next) => {
  try {
    var idUsuarioAbogado = Number(req.params.idUsuarioAbogado)
    if (!Number.isFinite(idUsuarioAbogado)) {
      throw Object.assign(new Error('Parametro idUsuarioAbogado invalido'), { status: 400 })
    }
    var CITAS = await listarCitasAbogado(idUsuarioAbogado)
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, verificarDuenoCita, async (req, res, next) => {
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
    await registrarAuditoria({ req, accion: 'CREAR', recurso: 'Cita', recursoId: c.id, detalle: 'agendamiento de cita' }).catch(e => log.error('AUDITORIA_ERR', { err: e.message }))
    res.status(201).json({ mensaje: 'Cita agendada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/cancelar', verificarToken, verificarDuenoCita, async (req, res, next) => {
  try {
    var { motivoCancelacion, canceladoPor } = req.body || {}
    var c = await cancelarCita(Number(req.params.id), { motivoCancelacion, canceladoPor })
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cita', recursoId: c.id, detalle: 'cancelacion de cita' }).catch(() => {})
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

router.put('/:id/reprogramar', verificarToken, verificarDuenoCita, async (req, res, next) => {
  try {
    var { fechaHoraCopia, idCalendario } = req.body
    var previa = await obtenerCita(Number(req.params.id))
    var c = await reprogramarCita(Number(req.params.id), fechaHoraCopia, idCalendario)
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cita', recursoId: c.id, detalle: `reprogramacion: ${previa.fechaHoraCopia} -> ${c.fechaHoraCopia}` }).catch(() => {})
    res.json({ mensaje: 'Cita reprogramada', cita: c })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarDuenoCita, async (req, res, next) => {
  try {
    var R = await eliminarCita(Number(req.params.id))
    res.json(R)
  } catch (error) { next(error) }
})

export default router
