import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { ejecutarConAuditoria } from '../auditoria/auditoria.servicio.js'
import {
  registrarCliente, obtenerCliente,
  actualizarCliente
} from './cliente.casosDeUso.js'

var router = Router()

// Público: registro de nueva cuenta de cliente (RF01).
router.post('/registro', async (req, res, next) => {
  try {
    var { identificacion, nombre, correo, contrasena, direccion, telefono } = req.body
    if (!identificacion || !nombre || !correo || !contrasena) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    var user_created = await ejecutarConAuditoria({
      req,
      accion: 'CREAR',
      recurso: 'Cliente',
      detalle: 'registro de cuenta de cliente',
      tarea: (cnn) => registrarCliente({ identificacion, nombre, correo, contrasena, direccion, telefono }, cnn),
    })
    var { contrasena: _, ...user_safe } = user_created

    res.status(201).json({
      mensaje: 'Cuenta de cliente creada',
      usuario: user_safe
    })
  } catch (error) { next(error) }
})

// El cliente solo puede consultar y modificar su propio perfil.
router.get('/:idUsuario', verificarToken, verificarRol('cliente'), async (req, res, next) => {
  try {
    if (Number(req.usuario.id) !== Number(req.params.idUsuario)) {
      return res.status(403).json({ error: 'No tienes permiso para consultar este perfil' })
    }
    var cliente = await obtenerCliente(Number(req.params.idUsuario))
    res.json({ cliente })
  } catch (error) { next(error) }
})

router.put('/:idUsuario', verificarToken, verificarRol('cliente'), async (req, res, next) => {
  try {
    if (Number(req.usuario.id) !== Number(req.params.idUsuario)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este perfil' })
    }
    var cliente = await ejecutarConAuditoria({
      req,
      accion: 'MODIFICAR',
      recurso: 'Cliente',
      detalle: 'actualizacion de datos del cliente',
      tarea: (cnn) => actualizarCliente(Number(req.params.idUsuario), req.body, cnn),
    })
    res.json({ mensaje: 'Cliente actualizado', cliente })
  } catch (error) { next(error) }
})

export default router