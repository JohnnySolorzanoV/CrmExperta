import { ejecutarConsulta } from './database.js'

// Ayudantes de autorización por pertenencia. Regla general:
// el administrador accede a todo; un cliente/abogado solo a sus propios recursos.

export function esAdministrador(usuario) {
  return Array.isArray(usuario?.roles) && usuario.roles.includes('administrador')
}

export function esElMismoUsuario(usuario, idUsuarioAComparar) {
  return Number(usuario?.id) === Number(idUsuarioAComparar)
}

function noAutorizado(res) {
  return res.status(403).json({ error: 'No tienes acceso a este recurso' })
}

// Middleware: permite si es administrador o si el id del token coincide con el recurso.
export function verificarMismoUsuarioOTarget(extraerId) {
  return function (req, res, next) {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' })
    if (esAdministrador(req.usuario)) return next()
    if (esElMismoUsuario(req.usuario, extraerId(req))) return next()
    return noAutorizado(res)
  }
}

function concedido(usuario, fila) {
  if (esAdministrador(usuario)) return true
  if (esElMismoUsuario(usuario, fila.cliente_usuario)) return true
  if (esElMismoUsuario(usuario, fila.abogado_usuario)) return true
  return false
}

export async function duenosDeCita(idCita) {
  var r = await ejecutarConsulta(
    `SELECT c.id_cliente, c.id_abogado,
            cl.id_usuario AS cliente_usuario, ab.id_usuario AS abogado_usuario
     FROM Cita c
     JOIN Cliente cl ON cl.id = c.id_cliente
     JOIN Abogado ab  ON ab.id  = c.id_abogado
     WHERE c.id = $1`,
    [idCita]
  )
  return r.rows[0] || null
}

export async function duenosDeCaso(idCaso) {
  var r = await ejecutarConsulta(
    `SELECT cs.id_cliente, cs.id_abogado,
            cl.id_usuario AS cliente_usuario, ab.id_usuario AS abogado_usuario
     FROM Caso cs
     JOIN Cliente cl ON cl.id = cs.id_cliente
     JOIN Abogado ab ON ab.id = cs.id_abogado
     WHERE cs.id = $1`,
    [idCaso]
  )
  return r.rows[0] || null
}

export async function duenosDeDocumento(idDocumento) {
  var r = await ejecutarConsulta(
    `SELECT dc.id_caso,
            cl.id_usuario AS cliente_usuario, ab.id_usuario AS abogado_usuario
     FROM Documento dc
     JOIN Caso cs ON cs.id = dc.id_caso
     JOIN Cliente cl ON cl.id = cs.id_cliente
     JOIN Abogado ab ON ab.id = cs.id_abogado
     WHERE dc.id = $1`,
    [idDocumento]
  )
  return r.rows[0] || null
}

export async function verificarDuenoCita(req, res, next, param = 'id') {
  if (!req.usuario) return res.status(401).json({ error: 'No autenticado' })
  var fila = await duenosDeCita(Number(req.params[param]))
  if (!fila) return res.status(404).json({ error: 'Cita no encontrada' })
  if (!concedido(req.usuario, fila)) return noAutorizado(res)
  next()
}

export async function verificarDuenoCaso(req, res, next, param = 'id') {
  if (!req.usuario) return res.status(401).json({ error: 'No autenticado' })
  var fila = await duenosDeCaso(Number(req.params[param]))
  if (!fila) return res.status(404).json({ error: 'Caso no encontrado' })
  if (!concedido(req.usuario, fila)) return noAutorizado(res)
  next()
}

export async function verificarDuenoDocumento(req, res, next, param = 'id') {
  if (!req.usuario) return res.status(401).json({ error: 'No autenticado' })
  var fila = await duenosDeDocumento(Number(req.params[param]))
  if (!fila) return res.status(404).json({ error: 'Documento no encontrado' })
  if (!concedido(req.usuario, fila)) return noAutorizado(res)
  next()
}