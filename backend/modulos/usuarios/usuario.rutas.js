import { Router as Rt } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarMismoUsuarioOTarget } from '../../config/autorizacion.js'
import { registrarAuditoria } from '../auditoria/auditoria.servicio.js'
import {
  listarUsuarios, obtenerUsuario, actualizarUsuario, eliminarUsuario,
  agregarRol, removerRol
} from './usuario.casosDeUso.js'

var router = Rt()

router.get('/', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var users = await listarUsuarios()
    res.json({ usuarios: users })
  } catch (error) { next(error) }
})

router.get('/:id', verificarToken, verificarMismoUsuarioOTarget(req => req.params.id), async (req, res, next) => {
  try {
    var u = await obtenerUsuario(Number(req.params.id))
    res.json({ usuario: u })
  } catch (error) { next(error) }
})

router.put('/:id', verificarToken, verificarMismoUsuarioOTarget(req => req.params.id), async (req, res, next) => {
  try {
    var { nombre, correo } = req.body
    var u = await actualizarUsuario(Number(req.params.id), { nombre, correo })
    res.json({ mensaje: 'Usuario actualizado', usuario: u })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var R = await eliminarUsuario(Number(req.params.id))
    res.json(R)
  } catch (error) { next(error) }
})

router.post('/:id/roles', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var { rol, numLicencia, especialidad } = req.body
    var R = await agregarRol(Number(req.params.id), rol, { numLicencia, especialidad })
    await registrarAuditoria({ req, accion: 'ASIGNAR', recurso: 'Rol', recursoId: Number(req.params.id), detalle: 'asignar rol: ' + rol }).catch(() => {})
    res.json(R)
  } catch (error) { next(error) }
})

router.delete('/:id/roles/:rol', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var R = await removerRol(Number(req.params.id), req.params.rol)
    res.json(R)
  } catch (error) { next(error) }
})

export default router