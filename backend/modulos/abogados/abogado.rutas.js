import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { registrarAuditoria } from '../auditoria/auditoria.servicio.js'
import {
  listarAbogados, obtenerAbogado, buscarPorEspecialidad,
  crearAbogado, actualizarAbogado, eliminarAbogado
} from './abogado.casosDeUso.js'

var router = Router()

router.get('/', verificarToken, async (req, res, next) => {
  try {
    var ABOGADOS = await listarAbogados()
    res.json({ abogados: ABOGADOS })
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, async (req, res, next) => {
  try {
    var a = await obtenerAbogado(Number(req.params.id))
    res.json({ abogado: a })
  } catch (error) { next(error) }
})

router.get('/especialidad/:especialidad', verificarToken, async (req, res, next) => {
  try {
    var ABOGADOS = await buscarPorEspecialidad(req.params.especialidad)
    res.json({ abogados: ABOGADOS })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var a = await crearAbogado(req.body)
    await registrarAuditoria({ req, accion: 'CREAR', recurso: 'Abogado', recursoId: a.id, detalle: 'alta de abogado' }).catch(() => {})
    res.status(201).json({ mensaje: 'Abogado creado', abogado: a })
  } catch (error) { next(error) }
})

router.put('/:id', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var a = await actualizarAbogado(Number(req.params.id), req.body)
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Abogado', recursoId: a.id, detalle: 'actualizacion de abogado' }).catch(() => {})
    res.json({ mensaje: 'Abogado actualizado', abogado: a })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var R = await eliminarAbogado(Number(req.params.id))
    await registrarAuditoria({ req, accion: 'ELIMINAR', recurso: 'Abogado', recursoId: Number(req.params.id), detalle: 'eliminacion de abogado' }).catch(() => {})
    res.json(R)
  } catch (error) { next(error) }
})

export default router
