import { default as bcryptMod } from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import * as authRepo from './auth.repositorio.js'
import { Usuario } from '../../entidades/usuario.js'
import { enviarEmail } from '../../config/google.js'

var claveJWT = process.env.JWT_SECRET || 'crm-experta-secreto-temporal'
var FRONTEND_URL = process.env.FRONTEND_URL || ''

export var registrarse = async ({ identificacion, nombre, correo, contrasena }) => {
  console.log('registrando:', correo)
  var ya_existe_mail = await authRepo.buscarPorCorreo(correo)
  if (ya_existe_mail) throw Object.assign(new Error('El correo ya esta registrado'), { status: 400 })

  var existeident = await authRepo.buscarPorIdentificacion(identificacion)
  if (existeident) throw Object.assign(new Error('La identificacion ya esta registrada'), { status: 400 })

  var contraHash = await bcryptMod.hash(contrasena, 10)
  var usr = new Usuario({ identificacion, nombre, correo, contrasena: contraHash })

  var RES = await authRepo.crear(usr)
  await authRepo.crearCliente(RES.id)

  console.log('user creado:', RES.id)
  return RES
}

export async function iniciarSesion({ correo, contrasena }) {
  var userr = await authRepo.buscarPorCorreo(correo)
  if (!userr) {
    throw Object.assign(new Error('Correo o contraseña incorrectos'), { status: 401 })
  }

  var PASS_val = await bcryptMod.compare(contrasena, userr.contrasena)
  if (!PASS_val) throw Object.assign(new Error('Correo o contraseña incorrectos'), { status: 401 })

  var ROLES_DEL_USER = await authRepo.detectarRoles(userr.id)
  console.log('roles:', ROLES_DEL_USER)

  var TOKEN = jwt.sign(
    { id: userr.id, correo: userr.correo, roles: ROLES_DEL_USER },
    claveJWT,
    { expiresIn: '8h' }
  )

  return {
    token: TOKEN,
    usuario: {
      id: userr.id,
      identificacion: userr.identificacion,
      nombre: userr.nombre,
      correo: userr.correo,
      roles: ROLES_DEL_USER
    }
  }
}

export async function recuperarContrasena(correo) {
  var validacionExiste = await authRepo.buscarPorCorreo(correo)
  if (!validacionExiste) {
    return { mensaje: 'Si el correo existe, te enviaremos instrucciones para recuperar la contraseña.' }
  }

  var tokenPlano = crypto.randomBytes(32).toString('hex')
  var tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex')

  await authRepo.guardarTokenRecuperacion(validacionExiste.id, tokenHash)

  var resetPath = `/reset-contrasena/${encodeURIComponent(tokenPlano)}`
  var enlaceReset = `${FRONTEND_URL.replace(/\/$/, '')}${resetPath}`

  var emailId = await enviarEmail({
    para: correo,
    asunto: 'Recuperacion de contrasena',
    titulo: 'Recupera tu contrasena',
    lineas: [
      'Recibimos una solicitud para restablecer tu contraseña en CRM Experta.',
      `Haz clic en este enlace para continuar: <a href="${enlaceReset}">${enlaceReset}</a>`,
      'Si no solicitaste este cambio, ignora este correo.'
    ]
  })
  if (emailId) {
    console.log('[Auth Reset] Email de recuperacion enviado a:', correo, 'id:', emailId)
  } else {
    console.log('[Auth Reset] No se pudo confirmar envio de email para:', correo)
  }

  return { mensaje: 'Si el correo existe, te enviaremos instrucciones para recuperar la contraseña.' }
}

export async function restablecerContrasena({ token, nuevaContrasena }) {
  if (!token || !nuevaContrasena) {
    throw Object.assign(new Error('Token y nueva contraseña son requeridos'), { status: 400 })
  }
  if (String(nuevaContrasena).length < 8) {
    throw Object.assign(new Error('La nueva contraseña debe tener al menos 8 caracteres'), { status: 400 })
  }

  var tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex')
  var userr = await authRepo.buscarPorTokenResetHashValido(tokenHash)
  if (!userr) {
    throw Object.assign(new Error('Token inválido'), { status: 400 })
  }

  var contrasenaHash = await bcryptMod.hash(nuevaContrasena, 10)
  await authRepo.actualizarContrasenaYLimpiarToken(userr.id, contrasenaHash)

  return { mensaje: 'Contraseña actualizada correctamente' }
}
