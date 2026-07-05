import jwt from 'jsonwebtoken'

export function crearTokenTest({ id, correo, roles }) {
  var secret = process.env.JWT_SECRET || 'crm-experta-secreto-temporal'
  return jwt.sign({ id, correo, roles }, secret, { expiresIn: '8h' })
}
