import { Router as Rt } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { verificarMismoUsuarioOTarget } from '../../config/autorizacion.js'
import { ejecutarConAuditoria } from '../auditoria/auditoria.servicio.js'
import {
  listarUsuarios, obtenerUsuario, actualizarUsuario, eliminarUsuario,
  agregarRol, removerRol, cambiarEstadoUsuario
} from './usuario.casosDeUso.js'

var router = Rt()

// Desactiva/activa una cuenta. Solo el administrador. La operación se audita de
// forma atómica; los accesos posteriores con tokens ya emitidos se rechazan
// porque verificarToken revalida el estado actual en cada petición.
router.put('/:id/estado', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var activo = Boolean(req.body?.activo)
    var accion = activo ? 'ACTIVAR' : 'DESACTIVAR'
    var previo = await obtenerUsuario(Number(req.params.id))
    var desde = previo.activo ? 'activo' : 'inactivo'
    var hacia = activo ? 'activo' : 'inactivo'
    var u = await ejecutarConAuditoria({
      req,
      accion,
      recurso: 'Usuario',
      recursoId: Number(req.params.id),
      detalle: 'cambio de estado: ' + desde + ' -> ' + hacia,
      tarea: (cnn) => cambiarEstadoUsuario(Number(req.params.id), activo, cnn),
    })
    res.json({ mensaje: accion === 'DESACTIVAR' ? 'Usuario desactivado' : 'Usuario activado', usuario: u })
  } catch (error) { next(error) }
})

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
    var u = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Usuario',
      recursoId: Number(req.params.id),
      detalle: 'actualizacion de datos basicos',
      tarea: (cnn) => actualizarUsuario(Number(req.params.id), { nombre, correo }, cnn),
    })
    res.json({ mensaje: 'Usuario actualizado', usuario: u })
  } catch (error) { next(error) }
})

router.delete('/:id', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var R = await ejecutarConAuditoria({
      req,
      accion: 'ELIMINAR',
      recurso: 'Usuario',
      recursoId: Number(req.params.id),
      detalle: 'eliminacion de usuario',
      tarea: (cnn) => eliminarUsuario(Number(req.params.id), cnn),
    })
    res.json(R)
  } catch (error) { next(error) }
})

router.post('/:id/roles', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var { rol, numLicencia, especialidad } = req.body
    var R = await ejecutarConAuditoria({
      req,
      accion: 'ASIGNAR',
      recurso: 'Rol',
      recursoId: Number(req.params.id),
      detalle: 'asignar rol: ' + rol,
      tarea: (cnn) => agregarRol(Number(req.params.id), rol, { numLicencia, especialidad }, cnn),
    })
    res.json(R)
  } catch (error) { next(error) }
})

router.delete('/:id/roles/:rol', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var R = await ejecutarConAuditoria({
      req,
      accion: 'QUITAR',
      recurso: 'Rol',
      recursoId: Number(req.params.id),
      detalle: 'quitar rol: ' + req.params.rol,
      tarea: (cnn) => removerRol(Number(req.params.id), req.params.rol, cnn),
    })
    res.json(R)
  } catch (error) { next(error) }
})

export default router