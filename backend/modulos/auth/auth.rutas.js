import { Router as routerExpress } from 'express'
import { iniciarSesion, recuperarContrasena } from './auth.casosDeUso.js'

var router = routerExpress()

router.post('/login', async (req, res, next) => {
  try {
    var { correo, contrasena } = req.body
    if (!correo || !contrasena) {
      var codigodeErr = 400
      return res.status(codigodeErr).json({ error: 'Correo y contraseña requeridos' })
    }

    var LOGIN_RESULT = await iniciarSesion({ correo, contrasena })
    res.json(LOGIN_RESULT)
  } catch (error) { next(error) }
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

export default router
