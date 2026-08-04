import { ejecutarConsulta } from '../../config/database.js'

// Servicio de auditoría persistente. Cada evento de negocio deja una fila en la
// tabla auditoria_logs para trazar quién, qué, cuándo y desde dónde.

function obtenerIp(req) {
  var ip = req?.ip || req?.connection?.remoteAddress || null
  if (ip && ip.startsWith('::ffff:')) ip = ip.slice(7)
  // supertest/express suele usar '::1' en localhost
  return ip === '::1' ? '127.0.0.1' : ip
}

async function obtenerNombre(usuarioId) {
  if (usuarioId == null) return null
  var r = await ejecutarConsulta('SELECT nombre FROM Usuario WHERE id = $1', [usuarioId])
  return r.rows[0]?.nombre || null
}

export async function registrarAuditoria({
  req,
  accion,
  recurso,
  recursoId = null,
  detalle = null,
  resultado = 'exito',
}) {
  var usuarioId = req?.usuario?.id ?? null
  var nombre = await obtenerNombre(usuarioId)
  if (nombre == null) nombre = req?.usuario?.nombre ?? null

  await ejecutarConsulta(
    `INSERT INTO auditoria_logs (usuario_id, usuario_nombre, accion, recurso, recurso_id, detalle, resultado, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [usuarioId, nombre, accion, recurso, recursoId, detalle, resultado, obtenerIp(req)]
  )
}

// Registro de intentos de notificación reutilizando la tabla de auditoría.
export async function registrarNotificacion({ para, asunto, resultado, detalle }) {
  var detalleFinal = detalle || (para ? 'destinatario:' + para : null)
  await ejecutarConsulta(
    `INSERT INTO auditoria_logs (usuario_id, usuario_nombre, accion, recurso, recurso_id, detalle, resultado, ip)
     VALUES (NULL, $1, 'NOTIFICACION', 'Email', NULL, $2, $3, NULL)`,
    [asunto || null, detalleFinal, resultado]
  )
}

// Lectura (para evidencias/pruebas): lista las auditorías de un recurso.
export async function listarAuditoria({ recurso, recursoId, limite = 200 } = {}) {
  var params = [limite]
  var where = ''
  if (recurso) {
    params.push(recurso)
    where = 'WHERE recurso = $' + params.length
    if (recursoId != null) {
      params.push(recursoId)
      where += ' AND recurso_id = $' + params.length
    }
  }
  var r = await ejecutarConsulta(
    `SELECT id, usuario_id, usuario_nombre, accion, recurso, recurso_id, detalle, resultado, ip, fecha
     FROM auditoria_logs ${where} ORDER BY fecha DESC LIMIT $1`,
    params
  )
  return r.rows
}