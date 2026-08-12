import jwt from 'jsonwebtoken'
import { ejecutarConsulta } from './database.js'

var SECRET_KEY = process.env.JWT_SECRET || 'crm-experta-secreto-temporal'
var SECRETO_POR_DEFECTO = 'crm-experta-secreto-temporal'

function usarSecretDefecto() {
  return !process.env.JWT_SECRET || process.env.JWT_SECRET === SECRETO_POR_DEFECTO
}

export async function verificarToken(req, res, next) {
  // En producción no se admite el secreto por defecto: evita tokens falsificables.
  if (process.env.NODE_ENV === 'production' && usarSecretDefecto()) {
    return next(Object.assign(new Error('Configuracion invalida: falta JWT_SECRET real'), { status: 500 }))
  }

  var HEADER_AUTH = req.headers['authorization']
  if (!HEADER_AUTH) {
    return next(Object.assign(new Error('Token requerido'), { status: 401 }))
  }

  var split_parts = HEADER_AUTH.split(' ')
  if (split_parts.length !== 2 || split_parts[0] !== 'Bearer') {
    return next(Object.assign(new Error('Formato de token invalido'), { status: 401 }))
  }

  var TOKEN_STRING = split_parts[1]
  var PAYLOAD_USER
  try {
    PAYLOAD_USER = jwt.verify(TOKEN_STRING, SECRET_KEY)
  } catch (e) {
    return next(Object.assign(new Error('Token invalido o expirado'), { status: 401 }))
  }

  // Normaliza roles siempre como array.
  if (!Array.isArray(PAYLOAD_USER.roles)) PAYLOAD_USER.roles = []
  req.usuario = PAYLOAD_USER

  // Vigencia de la cuenta: el JWT no se considera suficiente si el usuario fue
  // desactivado (o eliminado) DESPUÉS de emitirse. Se revalida el estado actual
  // en cada petición; los intentos rechazados quedan auditados por el manejador.
  try {
    var r = await ejecutarConsulta('SELECT activo FROM Usuario WHERE id = $1', [PAYLOAD_USER.id])
    var usuarioActivo = r.rows[0]?.activo
    if (usuarioActivo !== true) {
      return next(Object.assign(new Error('Esta cuenta ha sido desactivada'), { status: 403 }))
    }
  } catch (e) {
    return next(Object.assign(new Error('No se pudo verificar el estado de la cuenta'), { status: 500 }))
  }

  next()
}

export function verificarRol(...PERMISOS_ROLES) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(Object.assign(new Error('No autenticado'), { status: 401 }))
    }

    var roles_existentes = req.usuario.roles || []
    var flag_permiso = roles_existentes.some(r => PERMISOS_ROLES.includes(r))

    if (!flag_permiso) {
      return next(Object.assign(new Error('No tienes permiso para esto'), { status: 403 }))
    }

    next()
  }
}