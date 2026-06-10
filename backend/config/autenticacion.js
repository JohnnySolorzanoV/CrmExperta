import jwt from 'jsonwebtoken'

var SECRET_KEY = process.env.JWT_SECRET || 'crm-experta-secreto-temporal'

export function verificarToken(req, res, next) {
  var HEADER_AUTH = req.headers['authorization']
  if (!HEADER_AUTH) return res.status(401).json({ error: 'Token requerido' })

  var split_parts = HEADER_AUTH.split(' ')
  if (split_parts.length !== 2 || split_parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token invalido' })
  }

  var TOKEN_STRING = split_parts[1]
  try {
    var PAYLOAD_USER = jwt.verify(TOKEN_STRING, SECRET_KEY)
    req.usuario = PAYLOAD_USER
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Token invalido o expirado' })
  }
}

export function verificarRol(...PERMISOS_ROLES) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' })

    var roles_existentes = req.usuario.roles || []
    var flag_permiso = roles_existentes.some(r => PERMISOS_ROLES.includes(r))

    if (!flag_permiso) return res.status(403).json({ error: 'No tienes permiso para esto' })

    next()
  }
}
