import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import {
  listarCasos, obtenerCaso, listarCasosCliente, listarCasosAbogado,
  crearCaso, actualizarEstadoCaso
} from './caso.casosDeUso.js'

var router = Router()

router.get('/', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var CASOS = await listarCasos()
    res.json({ casos: CASOS })
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, async (req, res, next) => {
  try {
    var c = await obtenerCaso(Number(req.params.id))
    res.json({ caso: c })
  } catch (error) { next(error) }
})

router.get('/cliente/:idCliente', verificarToken, async (req, res, next) => {
  try {
    var CASOS = await listarCasosCliente(Number(req.params.idCliente))
    res.json({ casos: CASOS })
  } catch (error) { next(error) }
})

router.get('/abogado/:idAbogado', verificarToken, async (req, res, next) => {
  try {
    var CASOS = await listarCasosAbogado(Number(req.params.idAbogado))
    res.json({ casos: CASOS })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var c = await crearCaso(req.body)
    res.status(201).json({ mensaje: 'Caso creado', caso: c })
  } catch (error) { next(error) }
})

router.put('/:id/estado', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var { estado } = req.body
    var c = await actualizarEstadoCaso(Number(req.params.id), estado)
    res.json({ mensaje: 'Estado actualizado', caso: c })
  } catch (error) { next(error) }
})

export default router
