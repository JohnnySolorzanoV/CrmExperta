import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarDuenoCaso, verificarMismoUsuarioOTarget } from '../../config/autorizacion.js'
import { registrarAuditoria } from '../auditoria/auditoria.servicio.js'
import { log } from '../../config/logger.js'
import {
  listarCasos, obtenerCaso, listarCasosCliente, listarCasosAbogado,
  crearCaso, actualizarEstadoCaso, actualizarNotasConclusionesCaso
} from './caso.casosDeUso.js'

var router = Router()

router.get('/', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var CASOS = await listarCasos()
    res.json({ casos: CASOS })
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, verificarDuenoCaso, async (req, res, next) => {
  try {
    var c = await obtenerCaso(Number(req.params.id))
    res.json({ caso: c })
  } catch (error) { next(error) }
})

router.get('/cliente/:idCliente', verificarToken, verificarMismoUsuarioOTarget(req => req.params.idCliente), async (req, res, next) => {
  try {
    var CASOS = await listarCasosCliente(Number(req.params.idCliente))
    res.json({ casos: CASOS })
  } catch (error) { next(error) }
})

router.get('/abogado/:idAbogado', verificarToken, verificarMismoUsuarioOTarget(req => req.params.idAbogado), async (req, res, next) => {
  try {
    var CASOS = await listarCasosAbogado(Number(req.params.idAbogado))
    res.json({ casos: CASOS })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var c = await crearCaso(req.body)
    await registrarAuditoria({ req, accion: 'CREAR', recurso: 'Caso', recursoId: c.id, detalle: 'creacion de caso' }).catch(() => {})
    res.status(201).json({ mensaje: 'Caso creado', caso: c })
  } catch (error) { next(error) }
})

router.put('/:id/estado', verificarToken, verificarDuenoCaso, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var { estado } = req.body
    var previo = await obtenerCaso(Number(req.params.id))
    var c = await actualizarEstadoCaso(Number(req.params.id), estado)
    log.info('CASO_ESTADO_ACTUALIZADO', { casoId: c.id, desde: previo.estadoCaso, hacia: estado })
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Caso', recursoId: c.id, detalle: `cambio de estado: ${previo.estadoCaso} -> ${estado}` }).catch(() => {})
    res.json({ mensaje: 'Estado actualizado', caso: c })
  } catch (error) { next(error) }
})

router.put('/:id/notas-conclusiones', verificarToken, verificarDuenoCaso, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var { notas, conclusiones } = req.body
    var c = await actualizarNotasConclusionesCaso(Number(req.params.id), { notas, conclusiones })
    log.info('NOTAS_CASO_ACTUALIZADAS', { casoId: c.id })
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Caso', recursoId: c.id, detalle: 'actualizacion de notas y conclusiones del caso' }).catch(() => {})
    res.json({ mensaje: 'Notas y conclusiones actualizadas', caso: c })
  } catch (error) { next(error) }
})

export default router
