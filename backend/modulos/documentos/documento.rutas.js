import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import {
  listarDocumentos, obtenerDocumento, subirDocumento,
  actualizarDocumento, eliminarDocumento
} from './documento.casosDeUso.js'

var router = Router()

router.get('/caso/:idCaso', verificarToken, async (req, res, next) => {
  try {
    var DOCS = await listarDocumentos(Number(req.params.idCaso))
    res.json({ documentos: DOCS })
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, async (req, res, next) => {
  try {
    var d = await obtenerDocumento(Number(req.params.id))
    res.json({ documento: d })
  } catch (error) { next(error) }
})

router.post('/', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var d = await subirDocumento(req.body)
    res.status(201).json({ mensaje: 'Documento subido', documento: d })
  } catch (error) { next(error) }
})

router.put('/:id', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var d = await actualizarDocumento(Number(req.params.id), req.body)
    res.json({ mensaje: 'Documento actualizado', documento: d })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarRol('abogado', 'administrador'), async (req, res, next) => {
  try {
    var R = await eliminarDocumento(Number(req.params.id))
    res.json(R)
  } catch (error) { next(error) }
})

export default router
