import { Router as routerExpress } from 'express'
import { iniciarSesion, recuperarContrasena, restablecerContrasena } from './auth.casosDeUso.js'
import { registrarAuditoria } from '../auditoria/auditoria.servicio.js'
import { log } from '../../config/logger.js'

var router = routerExpress()

router.post('/login', async (req, res, next) => {
  try {
    var { correo, contrasena } = req.body
    if (!correo || !contrasena) {
      var codigodeErr = 400
      return res.status(codigodeErr).json({ error: 'Correo y contraseña requeridos' })
    }

    var LOGIN_RESULT = await iniciarSesion({ correo, contrasena })
    await registrarAuditoria({
      req: { ip: req.ip, usuario: LOGIN_RESULT.usuario },
      accion: 'LOGIN',
      recurso: 'Sesión',
      detalle: 'inicio de sesion exitoso'
    })
    res.json(LOGIN_RESULT)
  } catch (error) {
    await registrarAuditoria({
      req: { ip: req.ip, usuario: null },
      accion: 'LOGIN_FALLIDO',
      recurso: 'Sesión',
      recusoId: null,
      detalle: 'intento de inicio de sesion fallido para: ' + (req.body?.correo || '?'),
      resultado: 'fallido'
    }).catch(e => log.error('AUDITORIA_ERR', { err: e.message }))
    next(error)
  }
})

router.post('/recuperar-contrasena', async (req, res, next) => {
  try {
    var { correo } = req.body
    if (!correo) {
      var codigodeErr = 400
      return res.status(codigodeErr).json({ error: 'Correo requerido' })
    }

    var RECUP_RESULT = await recuperarContrasena(correo)
    res.json(RECUP_RESULT)
  } catch (error) { next(error) }
})

router.post('/restablecer-contrasena', async (req, res, next) => {
  try {
    var { token, nuevaContrasena } = req.body
    if (!token || !nuevaContrasena) {
      var codigodeErr = 400
      return res.status(codigodeErr).json({ error: 'Token y nueva contraseña requeridos' })
    }

    var RESET_RESULT = await restablecerContrasena({ token, nuevaContrasena })
    await registrarAuditoria({
      req,
      accion: 'CONTRASENA_RESTABLECIDA',
      recurso: 'Usuario',
      detalle: 'contraseña restablecida mediante token de recuperacion'
    })
    res.json(RESET_RESULT)
  } catch (error) { next(error) }
})

export default router
