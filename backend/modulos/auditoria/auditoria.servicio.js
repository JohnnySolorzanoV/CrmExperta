import { ejecutarConsulta, ejecutarEnTransaccion } from '../../config/database.js'
import { log } from '../../config/logger.js'

// Servicio de auditoría persistente. Cada evento de negocio deja una fila en la
// tabla auditoria_logs para trazar quién, qué, cuándo y desde dónde.
//
// Para las operaciones sensibles se exige consistencia: la operación y su
// auditoría se confirman (o revierten) juntas. Por eso `registrarAuditoria`
// acepta una conexión de transacción (`cnn`): si se pasa, el INSERT de auditoría
// se ejecuta dentro de la misma transacción que la mutación; si falla, todo se
// revierte con la operación.

function obtenerIp(req) {
  var ip = req?.ip || req?.connection?.remoteAddress || null
  if (ip && ip.startsWith('::ffff:')) ip = ip.slice(7)
  // supertest/express suele usar '::1' en localhost
  return ip === '::1' ? '127.0.0.1' : ip
}

async function obtenerNombre(usuarioId, cnn) {
  if (usuarioId == null) return null
  var q = cnn ? (txt, prms) => cnn.query(txt, prms) : ejecutarConsulta
  var r = await q('SELECT nombre FROM Usuario WHERE id = $1', [usuarioId])
  return r.rows[0]?.nombre || null
}

export async function registrarAuditoria({
  req,
  accion,
  recurso,
  recursoId = null,
  detalle = null,
  resultado = 'exito',
  cnn = null,
}) {
  var usuarioId = req?.usuario?.id ?? null
  var nombre = await obtenerNombre(usuarioId, cnn)
  if (nombre == null) nombre = req?.usuario?.nombre ?? null

  var q = cnn ? (txt, prms) => cnn.query(txt, prms) : ejecutarConsulta
  await q(
    `INSERT INTO auditoria_logs (usuario_id, usuario_nombre, accion, recurso, recurso_id, detalle, resultado, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [usuarioId, nombre, accion, recurso, recursoId, detalle, resultado, obtenerIp(req)]
  )
}

// Ejecuta una operación sensible y su auditoría en la MISMA transacción: si
// cualquiera de las dos falla, se revierte todo (resultado consistente).
// `tarea(cnn)` debe usar el cliente de transacción `cnn` para sus escrituras.
export async function ejecutarConAuditoria({
  req,
  accion,
  recurso,
  recursoId = null,
  detalle = null,
  tarea,
}) {
  return ejecutarEnTransaccion(async (cnn) => {
    var resultado = await tarea(cnn)
    await registrarAuditoria({ req, accion, recurso, recursoId, detalle, cnn })
    return resultado
  })
}

// Registra un intento fallido con resultado='fallido' sin bloquear al llamador.
export async function registrarIntentoFallido({ req, accion, recurso, detalle }) {
  try {
    await registrarAuditoria({ req, accion, recurso, detalle, resultado: 'fallido' })
  } catch (e) {
    // Nunca se silencia: se deja constancia en el log del servidor.
    log.error('AUDITORIA_ERR', { err: e?.message, contexto: 'registro de intento fallido' })
  }
}

// Deriva un nombre de acción legible a partir de la ruta y el método HTTP.
function inferirAccion(req) {
  var seg = (req.originalUrl || req.url || '').split('?')[0].split('/').filter(Boolean)
  var ultimo = seg[seg.length - 1]
  if (ultimo && /^[a-z]/i.test(ultimo) && !/^\d+$/.test(ultimo)) {
    return ultimo.replace(/-/g, '_').toUpperCase()
  }
  var porMetodo = { GET: 'LEER', POST: 'CREAR', PUT: 'MODIFICAR', PATCH: 'MODIFICAR', DELETE: 'ELIMINAR' }
  return porMetodo[req.method] || req.method || 'OPERACION'
}

// Deriva la entidad (recurso) a partir del primer segmento tras /api.
function inferirRecurso(req) {
  var seg = (req.originalUrl || req.url || '').split('?')[0].split('/').filter(Boolean)
  var nombre = seg[0] === 'api' ? (seg[1] || 'Ruta') : (seg[0] || 'Ruta')
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

// Audita un intento fallido detectado en el manejador central de errores.
export async function auditarIntentoFallido(req, err) {
  await registrarAuditoria({
    req,
    accion: inferirAccion(req),
    recurso: inferirRecurso(req),
    detalle: (err?.message || 'error') + ' en ' + (req.originalUrl || req.url),
    resultado: 'fallido',
  })
}

// Registro de intentos de notificación reutilizando la tabla de auditoría.
export async function registrarNotificacion({ para, asunto, resultado, detalle }) {
  var detalleFinal = detalle || null
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