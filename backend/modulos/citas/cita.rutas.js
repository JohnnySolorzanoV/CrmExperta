import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarDuenoCita, verificarMismoUsuario, verificarAbogadoDeCita } from '../../config/autorizacion.js'
import { ejecutarConAuditoria } from '../auditoria/auditoria.servicio.js'
import { ejecutarConsulta } from '../../config/database.js'
import {
  obtenerCita, listarCitasCliente, listarCitasAbogado,
  agendarCita, cancelarCita, aceptarCita, completarCita, rechazarCita,
  reprogramarCita
} from './cita.casosDeUso.js'

var router = Router()

router.get('/cliente/:idUsuarioCliente', verificarToken, verificarMismoUsuario(req => req.params.idUsuarioCliente), async (req, res, next) => {
  try {
    var idUsuarioCliente = Number(req.params.idUsuarioCliente)
    if (!Number.isFinite(idUsuarioCliente)) {
      throw Object.assign(new Error('Parametro idUsuarioCliente invalido'), { status: 400 })
    }
    var CITAS = await listarCitasCliente(idUsuarioCliente)
    res.json({ citas: CITAS })
  } catch (error) { next(error) }
})

router.get('/abogado/:idUsuarioAbogado', verificarToken, verificarMismoUsuario(req => req.params.idUsuarioAbogado), async (req, res, next) => {
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

// Un cliente solo puede agendar para sí mismo.
router.post('/', verificarToken, verificarRol('cliente'), async (req, res, next) => {
  try {
    var payload = { ...req.body }
    payload.idCliente = req.usuario.id

    if (!payload.idAbogado) {
      throw Object.assign(new Error('Debes asignar un abogado antes de crear la cita'), { status: 400 })
    }
    var c = await agendarCita(payload, {
      req, accion: 'CREAR', recurso: 'Cita', detalle: 'agendamiento de cita'
    })
    res.status(201).json({ mensaje: 'Cita agendada', cita: c })
  } catch (error) { next(error) }
})

// canceladoPor se deriva del rol del usuario autenticado; el cliente no puede falsearlo.
router.put('/:id/cancelar', verificarToken, verificarDuenoCita, async (req, res, next) => {
  try {
    var { motivoCancelacion } = req.body || {}
    var canceladoPor = Array.isArray(req.usuario.roles) && req.usuario.roles.includes('abogado')
      ? 'abogado'
      : 'cliente'
    var c = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Cita',
      recursoId: Number(req.params.id),
      detalle: 'cancelacion de cita por ' + canceladoPor + ': -> cancelada',
      tarea: (cnn) => cancelarCita(Number(req.params.id), { motivoCancelacion, canceladoPor, cnn }),
    })
    res.json({ mensaje: 'Cita cancelada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/aceptar', verificarToken, verificarRol('abogado'), verificarAbogadoDeCita, async (req, res, next) => {
  try {
    var previa = await obtenerCita(Number(req.params.id))
    var c = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Cita',
      recursoId: Number(req.params.id),
      detalle: 'aceptacion de cita: ' + previa.estadoCita + ' -> confirmada',
      tarea: (cnn) => aceptarCita(Number(req.params.id), cnn),
    })
    res.json({ mensaje: 'Cita aceptada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/rechazar', verificarToken, verificarRol('abogado'), verificarAbogadoDeCita, async (req, res, next) => {
  try {
    var previa = await obtenerCita(Number(req.params.id))
    var c = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Cita',
      recursoId: Number(req.params.id),
      detalle: 'rechazo de cita: ' + previa.estadoCita + ' -> rechazada',
      tarea: (cnn) => rechazarCita(Number(req.params.id), cnn),
    })
    res.json({ mensaje: 'Cita rechazada', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/completar', verificarToken, verificarRol('abogado'), verificarAbogadoDeCita, async (req, res, next) => {
  try {
    var c = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Cita',
      recursoId: Number(req.params.id),
      detalle: 'cita marcada como cumplida: confirmada -> completada',
      tarea: (cnn) => completarCita(Number(req.params.id), cnn),
    })
    res.json({ mensaje: 'Cita marcada como cumplida', cita: c })
  } catch (error) { next(error) }
})

router.put('/:id/reprogramar', verificarToken, verificarDuenoCita, async (req, res, next) => {
  try {
    var { fechaHoraCopia, idCalendario } = req.body

    // El horario debe pertenecer al abogado ASIGNADO a la cita (no al usuario
    // autenticado): así el cliente propietario también puede reagendar.
    var ocupado = await ejecutarConsulta(
      `SELECT c.id, a.id AS abogado_pk, a.id_usuario AS abogado_usuario, c.fecha_hora_copia
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
      if (Number(slot.rows[0].id_abogado) !== Number(citaActualOk.abogado_pk)) {
        throw Object.assign(new Error('El horario no pertenece al abogado de la cita'), { status: 403 })
      }
    }

    var c = await reprogramarCita(Number(req.params.id), fechaHoraCopia, idCalendario, {
      req, accion: 'MODIFICAR', recurso: 'Cita'
    })
    res.json({ mensaje: 'Cita reprogramada', cita: c })
  } catch (error) { next(error) }
})

export default router