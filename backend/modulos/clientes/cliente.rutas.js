import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { registrarAuditoria } from '../auditoria/auditoria.servicio.js'
import {
  registrarCliente, listarClientes, obtenerCliente,
  actualizarCliente, cambiarEstadoCliente
} from './cliente.casosDeUso.js'

var router = Router()

// Público: registro de nueva cuenta de cliente (RF01).
router.post('/registro', async (req, res, next) => {
  try {
    var { identificacion, nombre, correo, contrasena, direccion, telefono } = req.body
    if (!identificacion || !nombre || !correo || !contrasena) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    var user_created = await registrarCliente({ identificacion, nombre, correo, contrasena, direccion, telefono })
    var { contrasena: _, ...user_safe } = user_created

    await registrarAuditoria({
      req,
      accion: 'CREAR',
      recurso: 'Cliente',
      recursoId: user_created.id,
      detalle: 'registro de cuenta de cliente'
    }).catch(() => {})

    res.status(201).json({
      mensaje: 'Cuenta de cliente creada',
      usuario: user_safe
    })
  } catch (error) { next(error) }
})

// Reservado a administradores: listar / detalle de clientes (RF02).
router.get('/', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var clientes = await listarClientes()
    res.json({ clientes })
  } catch (error) { next(error) }
})

router.get('/:idUsuario', verificarToken, verificarRol('administrador', 'cliente'), async (req, res, next) => {
  try {
    // El cliente solo puede consultar su propio perfil.
    if (req.usuario?.roles?.includes('cliente') && Number(req.usuario.id) !== Number(req.params.idUsuario)) {
      return res.status(403).json({ error: 'No tienes permiso para consultar este perfil' })
    }
    var cliente = await obtenerCliente(Number(req.params.idUsuario))
    res.json({ cliente })
  } catch (error) { next(error) }
})

router.put('/:idUsuario', verificarToken, verificarRol('administrador', 'cliente'), async (req, res, next) => {
  try {
    if (req.usuario?.roles?.includes('cliente') && Number(req.usuario.id) !== Number(req.params.idUsuario)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este perfil' })
    }
    var cliente = await actualizarCliente(Number(req.params.idUsuario), req.body)
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cliente', recursoId: cliente.id, detalle: 'actualizacion de datos del cliente' }).catch(() => {})
    res.json({ mensaje: 'Cliente actualizado', cliente })
  } catch (error) { next(error) }
})

// Desactivación / reactivación lógica (RF02) — solo administradores.
router.put('/:idUsuario/estado', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var activo = Boolean(req.body.activo)
    var cliente = await cambiarEstadoCliente(Number(req.params.idUsuario), activo)
    await registrarAuditoria({ req, accion: 'MODIFICAR', recurso: 'Cliente', recursoId: cliente.id, detalle: activo ? 'cliente activado' : 'cliente desactivado (baja logica)' }).catch(() => {})
    res.json({ mensaje: activo ? 'Cliente reactivado' : 'Cliente desactivado', cliente })
  } catch (error) { next(error) }
})

export default router