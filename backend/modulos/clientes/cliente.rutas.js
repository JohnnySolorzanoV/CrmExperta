import { Router } from 'express'
import { registrarCliente } from './cliente.casosDeUso.js'

var router = Router()

router.post('/registro', async (req, res, next) => {
  try {
    var { identificacion, nombre, correo, contrasena, direccion, telefono } = req.body
    if (!identificacion || !nombre || !correo || !contrasena) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    var user_created = await registrarCliente({ identificacion, nombre, correo, contrasena, direccion, telefono })
    var { contrasena: _, ...user_safe } = user_created

    res.status(201).json({
      mensaje: 'Cuenta de cliente creada',
      usuario: user_safe
    })
  } catch (error) { next(error) }
})

export default router
