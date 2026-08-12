import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarDuenoCaso, verificarMismoUsuario } from '../../config/autorizacion.js'
import { ejecutarConAuditoria } from '../auditoria/auditoria.servicio.js'
import { log } from '../../config/logger.js'
import {
  obtenerCaso, listarCasosCliente, listarCasosAbogado,
  crearCaso, actualizarEstadoCaso, actualizarNotasConclusionesCaso
} from './caso.casosDeUso.js'

var router = Router()

router.get('/:id', verificarToken, verificarDuenoCaso, async (req, res, next) => {
  try {
    var c = await obtenerCaso(Number(req.params.id))
    res.json({ caso: c })
  } catch (error) { next(error) }
})

router.get('/cliente/:idCliente', verificarToken, verificarMismoUsuario(req => req.params.idCliente), async (req, res, next) => {
  try {
    var CASOS = await listarCasosCliente(Number(req.params.idCliente))
    res.json({ casos: CASOS })
  } catch (error) { next(error) }
})

router.get('/abogado/:idAbogado', verificarToken, verificarMismoUsuario(req => req.params.idAbogado), async (req, res, next) => {
  try {
    var CASOS = await listarCasosAbogado(Number(req.params.idAbogado))
    res.json({ casos: CASOS })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('abogado'), async (req, res, next) => {
  try {
    var c = await ejecutarConAuditoria({
      req,
      accion: 'CREAR',
      recurso: 'Caso',
      detalle: 'creacion de caso',
      tarea: (cnn) => crearCaso(req.body, cnn),
    })
    res.status(201).json({ mensaje: 'Caso creado', caso: c })
  } catch (error) { next(error) }
})

router.put('/:id/estado', verificarToken, verificarDuenoCaso, verificarRol('abogado'), async (req, res, next) => {
  try {
    var { estado } = req.body
    var previo = await obtenerCaso(Number(req.params.id))
    var c = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Caso',
      detalle: `cambio de estado: ${previo.estadoCaso} -> ${estado}`,
      tarea: (cnn) => actualizarEstadoCaso(Number(req.params.id), estado, cnn),
    })
    log.info('CASO_ESTADO_ACTUALIZADO', { casoId: c.id, desde: previo.estadoCaso, hacia: estado })
    res.json({ mensaje: 'Estado actualizado', caso: c })
  } catch (error) { next(error) }
})

router.put('/:id/notas-conclusiones', verificarToken, verificarDuenoCaso, verificarRol('abogado'), async (req, res, next) => {
  try {
    var { notas, conclusiones } = req.body
    var c = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Caso',
      detalle: 'actualizacion de notas y conclusiones del caso',
      tarea: (cnn) => actualizarNotasConclusionesCaso(Number(req.params.id), { notas, conclusiones }, cnn),
    })
    log.info('NOTAS_CASO_ACTUALIZADAS', { casoId: c.id })
    res.json({ mensaje: 'Notas y conclusiones actualizadas', caso: c })
  } catch (error) { next(error) }
})

export default router
