import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarDuenoCita, verificarMismoUsuarioOTarget, verificarAbogadoDeCita } from '../../config/autorizacion.js'
import { registrarAuditoria } from '../auditoria/auditoria.servicio.js'
import {
  listarCitas, obtenerCita, listarCitasCliente, listarCitasAbogado,
  agendarCita, cancelarCita, aceptarCita, completarCita, rechazarCita,
  reprogramarCita, eliminarCita
} from './cita.casosDeUso.js'
import { ejecutarConsulta } from '../../config/database.js'

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

// Un cliente solo puede agendar para sí mismo. El administrador sí puede asignar.
router.post('/', verificarToken, verificarRol('cliente', 'administrador'), async (req, res, next) => {
  try {
    var payload = { ...req.body }
    var esAdmin = Array.isArray(req.usuario.roles) && req.usuario.roles.includes('administrador')
    if (!esAdmin) {
      payload.idCliente = req.usuario.id
    }

    if (!payload.idAbogado) {
      throw Object.assign(new Error('Debes asignar un abogado antes de crear la cita'), { status: 400 })
    }
    var c = await agendarCita(payload)
    await registrarAuditoria({ req, accion: 'CREAR', recurso: 'Cita', recursoId: c.id, detalle: 'agendamiento de cita' })
    res.status(201).json({ mensaje: 'Cita agendada', cita: c })
  } catch (error) { next(error) }
})

// canceladoPor se deriva del rol del usuario autenticado; el cliente no puede falsearlo.
router.put('/:id/cancelar', verificarToken, verificarDuenoCita, async (req, res, next) => {
  try {
    var { motivoCancelacion } = req.body || {}
    var canceladoPor = Array.isArray(req.usuario.roles) && req.usuario.roles.includes('abogado')
      ? 'abogado'
      : Array.isArray(req.usuario.roles) && req.usuario.roles.includes('administrador')
        ? 'administrador'
        : 'cliente'
    var c = await cancelarCita(Number(req.params.id), { motivoCancelacion, canceladoPor })
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cita', recursoId: c.id, detalle: 'cancelacion de cita' })
    res.json({ mensaje: 'Cita cancelada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/aceptar', verificarToken, verificarRol('abogado', 'administrador'), verificarAbogadoDeCita, async (req, res, next) => {
  try {
    var c = await aceptarCita(Number(req.params.id))
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cita', recursoId: c.id, detalle: 'aceptacion de cita' })
    res.json({ mensaje: 'Cita aceptada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/rechazar', verificarToken, verificarRol('abogado', 'administrador'), verificarAbogadoDeCita, async (req, res, next) => {
  try {
    var c = await rechazarCita(Number(req.params.id))
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cita', recursoId: c.id, detalle: 'rechazo de cita' })
    res.json({ mensaje: 'Cita rechazada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/completar', verificarToken, verificarRol('abogado', 'administrador'), verificarAbogadoDeCita, async (req, res, next) => {
  try {
    var c = await completarCita(Number(req.params.id))
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cita', recursoId: c.id, detalle: 'cita marcada como cumplida' })
    res.json({ mensaje: 'Cita marcada como cumplida', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/reprogramar', verificarToken, verificarDuenoCita, async (req, res, next) => {
  try {
    var { fechaHoraCopia, idCalendario } = req.body
    var esAdmin = Array.isArray(req.usuario.roles) && req.usuario.roles.includes('administrador')

    // El abogado solo puede reprogramar con su idCalendario si el slot le pertenece.
    var ocupado = await ejecutarConsulta(
      `SELECT c.id, a.id_usuario AS abogado_usuario, c.fecha_hora_copia
       FROM Cita c JOIN Abogado a ON a.id = c.id_abogado WHERE c.id = $1`,
      [Number(req.params.id)]
    )
    var citaActualOk = ocupado.rows[0]
    if (!citaActualOk) throw Object.assign(new Error('Cita no encontrada'), { status: 404 })

    if (idCalendario) {
      var slot = await ejecutarConsulta(
        `SELECT id_abogado, fecha_evento FROM Calendario WHERE id = $1`,
        [idCalendario]
      )
      if (slot.rows.length === 0) throw Object.assign(new Error('Horario no encontrado'), { status: 404 })
      var abogadoDelSlot = await ejecutarConsulta(
        'SELECT id_usuario FROM Abogado WHERE id = $1', [slot.rows[0].id_abogado]
      )
      if (!esAdmin && Number(abogadoDelSlot.rows[0].id_usuario) !== Number(req.usuario.id)) {
        throw Object.assign(Object.assign(new Error('El horario no pertenece al abogado'), { status: 403 }))
      }
    }

    var previa = await obtenerCita(Number(req.params.id))
    var c = await reprogramarCita(Number(req.params.id), fechaHoraCopia, idCalendario)
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cita', recursoId: c.id, detalle: `reprogramacion: ${previa.fechaHoraCopia} -> ${c.fechaHoraCopia}` })
    res.json({ mensaje: 'Cita reprogramada', cita: c })
  } catch (error) { next(error) }
})

// La eliminación física queda restringida al administrador y siempre queda auditada.
router.delete('/:id', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var R = await eliminarCita(Number(req.params.id))
    await registrarAuditoria({ req, accion: 'ELIMINAR', recurso: 'Cita', recursoId: Number(req.params.id), detalle: 'eliminacion fisica de cita' })
    res.json(R)
  } catch (error) { next(error) }
})

export default router