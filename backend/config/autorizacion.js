import { ejecutarConsulta } from './database.js'

// Ayudantes de autorización por pertenencia. Regla general:
// el administrador accede a todo; un cliente/abogado solo a sus propios recursos.

export function esAdministrador(usuario) {
  return Array.isArray(usuario?.roles) && usuario.roles.includes('administrador')
}

export function esElMismoUsuario(usuario, idUsuarioAComparar) {
  return Number(usuario?.id) === Number(idUsuarioAComparar)
}

function errorConStatus(mensaje, status) {
  return Object.assign(new Error(mensaje), { status })
}

// Los rechazos se propagan con next(error) para que el manejador central de
// errores registre el intento fallido en auditoría (resultado='fallido').
function noAutorizado(next) {
  return next(errorConStatus('No tienes acceso a este recurso', 403))
}

// Middleware: permite si es administrador o si el id del token coincide con el recurso.
// Se usa solo en módulos administrativos (usuarios). Los módulos operativos usan
// verificarMismoUsuario, que no concede acceso al administrador.
export function verificarMismoUsuarioOTarget(extraerId) {
  return function (req, res, next) {
    if (!req.usuario) return next(errorConStatus('No autenticado', 401))
    if (esAdministrador(req.usuario)) return next()
    if (esElMismoUsuario(req.usuario, extraerId(req))) return next()
    return noAutorizado(next)
  }
}

// Middleware estricto: permite solo si el id del token coincide con el recurso.
// El administrador no tiene acceso a los recursos operativos (citas, casos,
// documentos, calendario, chatbot, clientes).
export function verificarMismoUsuario(extraerId) {
  return function (req, res, next) {
    if (!req.usuario) return next(errorConStatus('No autenticado', 401))
    if (esElMismoUsuario(req.usuario, extraerId(req))) return next()
    return noAutorizado(next)
  }
}

function concedido(usuario, fila) {
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
  if (!req.usuario) return next(errorConStatus('No autenticado', 401))
  var fila = await duenosDeCita(Number(req.params[param]))
  if (!fila) return next(errorConStatus('Cita no encontrada', 404))
  if (!concedido(req.usuario, fila)) return noAutorizado(next)
  next()
}

// Permite solo al abogado asignado (o al administrador) operar sobre la cita.
export async function verificarAbogadoDeCita(req, res, next, param = 'id') {
  if (!req.usuario) return next(errorConStatus('No autenticado', 401))
  var fila = await duenosDeCita(Number(req.params[param]))
  if (!fila) return next(errorConStatus('Cita no encontrada', 404))
  if (esElMismoUsuario(req.usuario, fila.abogado_usuario)) return next()
  return noAutorizado(next)
}

export async function verificarDuenoCaso(req, res, next, param = 'id') {
  if (!req.usuario) return next(errorConStatus('No autenticado', 401))
  var fila = await duenosDeCaso(Number(req.params[param]))
  if (!fila) return next(errorConStatus('Caso no encontrado', 404))
  if (!concedido(req.usuario, fila)) return noAutorizado(next)
  next()
}

export async function verificarDuenoDocumento(req, res, next, param = 'id') {
  if (!req.usuario) return next(errorConStatus('No autenticado', 401))
  var fila = await duenosDeDocumento(Number(req.params[param]))
  if (!fila) return next(errorConStatus('Documento no encontrado', 404))
  if (!concedido(req.usuario, fila)) return noAutorizado(next)
  next()
}

// Acceso al historial del chatbot de un usuario. El cliente accede solo a su
// propia información; un abogado accede al de un cliente únicamente cuando tiene
// un caso asignado (relación de negocio). El administrador queda excluido de los
// recursos operativos. El identificador sensible se valida siempre contra el
// usuario autenticado, nunca se confía en el de la solicitud.
export async function verificarHistorialChatbot(req, res, next, param = 'idUsuario') {
  if (!req.usuario) return next(errorConStatus('No autenticado', 401))
  var idSolicitado = Number(req.params[param])
  if (!Number.isFinite(idSolicitado)) {
    return next(errorConStatus('Parametro idUsuario invalido', 400))
  }

  // El mismo usuario siempre puede consultar su propio historial.
  if (esElMismoUsuario(req.usuario, idSolicitado)) return next()

  // Abogado con un caso asignado a ese cliente.
  var r = await ejecutarConsulta(
    `SELECT 1
       FROM Caso cs
       JOIN Abogado a ON a.id = cs.id_abogado
       JOIN Cliente cl ON cl.id = cs.id_cliente
      WHERE a.id_usuario = $1 AND cl.id_usuario = $2
      LIMIT 1`,
    [req.usuario.id, idSolicitado]
  )
  if (r.rows.length > 0) return next()
  return noAutorizado(next)
}