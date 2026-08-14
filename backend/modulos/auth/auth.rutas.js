import { Router as routerExpress } from 'express'
import { iniciarSesion, recuperarContrasena, restablecerContrasena } from './auth.casosDeUso.js'
import { registrarAuditoria, ejecutarConAuditoria } from '../auditoria/auditoria.servicio.js'
import { verificarToken } from '../../config/autenticacion.js'
import { log } from '../../config/logger.js'

var router = routerExpress()

router.post('/login', async (req, res, next) => {
  try {
    var { correo, contrasena } = req.body
    if (!correo || !contrasena) {
      throw Object.assign(new Error('Correo y contraseña requeridos'), { status: 400 })
    }

    var LOGIN_RESULT = await iniciarSesion({ correo, contrasena })
    // El login no tiene una mutación que revertir; si el log falla, el intento se
    // registra vía el manejador de errores (resultado='fallido') y no se oculta.
    await registrarAuditoria({
      req: { ip: req.ip, usuario: LOGIN_RESULT.usuario },
      accion: 'LOGIN',
      recurso: 'Sesión',
      recursoId: LOGIN_RESULT.usuario?.id ?? null,
      detalle: 'inicio de sesion exitoso'
    }).catch(e => log.error('AUDITORIA_ERR', { err: e.message, contexto: 'login exitoso' }))
    res.json(LOGIN_RESULT)
  } catch (error) {
    next(error)
  }
})

router.post('/logout', verificarToken, async (req, res, next) => {
  try {
    await registrarAuditoria({
      req,
      accion: 'CERRAR_SESION',
      recurso: 'Sesión',
      recursoId: req.usuario?.id ?? null,
      detalle: 'cierre de sesion'
    })
    res.json({ mensaje: 'Sesion cerrada' })
  } catch (error) { next(error) }
})

router.post('/recuperar-contrasena', async (req, res, next) => {
  try {
    var { correo } = req.body
    if (!correo) {
      throw Object.assign(new Error('Correo requerido'), { status: 400 })
    }

    var RECUP_RESULT = await recuperarContrasena(correo)
    await registrarAuditoria({
      req,
      accion: 'RECUPERAR_CONTRASENA',
      recurso: 'Usuario',
      detalle: 'solicitud de recuperacion de contraseña para ' + correo
    }).catch(e => log.error('AUDITORIA_ERR', { err: e.message, contexto: 'recuperacion de contrasena' }))
    res.json(RECUP_RESULT)
  } catch (error) { next(error) }
})

router.post('/restablecer-contrasena', async (req, res, next) => {
  try {
    var { token, nuevaContrasena } = req.body
    if (!token || !nuevaContrasena) {
      throw Object.assign(new Error('Token y nueva contraseña requeridos'), { status: 400 })
    }

    // Restablecimiento atómico: la contraseña y su auditoría se confirman juntas.
    var RESET_RESULT = await ejecutarConAuditoria({
      req,
      accion: 'CONTRASENA_RESTABLECIDA',
      recurso: 'Usuario',
      detalle: 'contraseña restablecida mediante token de recuperacion',
      tarea: (cnn) => restablecerContrasena({ token, nuevaContrasena }, cnn),
    })
    res.json(RESET_RESULT)
  } catch (error) { next(error) }
})

export default router
