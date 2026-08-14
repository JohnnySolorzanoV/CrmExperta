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

function resolverRecursoId(recursoId, resultado) {
  if (recursoId != null && recursoId !== '') return recursoId
  if (resultado && typeof resultado === 'object' && resultado.id != null) return resultado.id
  return null
}

// Registro público y recuperaciones no tienen token: el actor es el usuario
// recién creado o, en fallos, el nombre/correo enviado en el formulario.
function actorDesdeSujeto(sujeto) {
  if (!sujeto || typeof sujeto !== 'object') return { id: null, nombre: null }
  if (sujeto.id == null) return { id: null, nombre: null }
  if (sujeto.nombre == null && sujeto.correo == null && sujeto.identificacion == null) {
    return { id: null, nombre: null }
  }
  return { id: sujeto.id, nombre: sujeto.nombre || null }
}

function nombrePublicoDesdeBody(req) {
  var body = req?.body
  if (!body || typeof body !== 'object') return null
  var candidato = body.nombre || body.correo
  if (typeof candidato !== 'string') return null
  var texto = candidato.trim()
  return texto ? truncarTexto(texto, 100) : null
}

export function truncarTexto(valor, max = 150) {
  var texto = String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim()
  if (texto.length <= max) return texto
  return texto.slice(0, max) + '…'
}

export async function registrarAuditoria({
  req,
  accion,
  recurso,
  recursoId = null,
  detalle = null,
  resultado = 'exito',
  cnn = null,
  sujeto = null,
}) {
  var usuarioId = req?.usuario?.id ?? null
  var nombreHint = req?.usuario?.nombre ?? null
  if (usuarioId == null) {
    var actor = actorDesdeSujeto(sujeto)
    if (actor.id != null) usuarioId = actor.id
    if (nombreHint == null) nombreHint = actor.nombre
  }

  var nombre = await obtenerNombre(usuarioId, cnn)
  if (nombre == null) nombre = nombreHint
  if (nombre == null) nombre = nombrePublicoDesdeBody(req)

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
    await registrarAuditoria({
      req,
      accion,
      recurso,
      recursoId: resolverRecursoId(recursoId, resultado),
      detalle,
      cnn,
      sujeto: resultado,
    })
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

function segmentosRuta(req) {
  return (req.originalUrl || req.url || '').split('?')[0].split('/').filter(Boolean)
}

// Deriva un nombre de acción legible a partir de la ruta y el método HTTP.
function inferirAccion(req) {
  var seg = segmentosRuta(req)
  var ultimo = seg[seg.length - 1]
  if (ultimo && /^[a-z]/i.test(ultimo) && !/^\d+$/.test(ultimo)) {
    return ultimo.replace(/-/g, '_').toUpperCase()
  }
  var porMetodo = { GET: 'LEER', POST: 'CREAR', PUT: 'MODIFICAR', PATCH: 'MODIFICAR', DELETE: 'ELIMINAR' }
  return porMetodo[req.method] || req.method || 'OPERACION'
}

// Deriva la entidad (recurso) a partir del primer segmento tras /api.
function inferirRecurso(req) {
  var seg = segmentosRuta(req)
  var nombre = seg[0] === 'api' ? (seg[1] || 'Ruta') : (seg[0] || 'Ruta')
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

function inferirRecursoId(req) {
  var seg = segmentosRuta(req)
  for (var i = seg.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(seg[i])) return Number(seg[i])
  }
  return null
}

// Audita un intento fallido detectado en el manejador central de errores.
export async function auditarIntentoFallido(req, err) {
  await registrarAuditoria({
    req,
    accion: inferirAccion(req),
    recurso: inferirRecurso(req),
    recursoId: inferirRecursoId(req),
    detalle: (err?.message || 'error') + ' en ' + (req.originalUrl || req.url),
    resultado: 'fallido',
  })
}

// Registro de intentos de notificación reutilizando la tabla de auditoría.
// `usuario_nombre` guarda el asunto; `detalle` guarda el destinatario y el error.
export async function registrarNotificacion({ para, asunto, resultado, detalle }) {
  var partes = []
  if (para) partes.push('para=' + para)
  if (detalle) partes.push(detalle)
  var detalleFinal = partes.length ? partes.join('; ') : null
  await ejecutarConsulta(
    `INSERT INTO auditoria_logs (usuario_id, usuario_nombre, accion, recurso, recurso_id, detalle, resultado, ip)
     VALUES (NULL, $1, 'NOTIFICACION', 'Email', NULL, $2, $3, NULL)`,
    [asunto || null, detalleFinal, resultado]
  )
}

function agregarFiltro(where, params, sql, valor) {
  if (valor == null || valor === '') return
  params.push(valor)
  where.push(sql.replace('?', '$' + params.length))
}

function construirFiltros({ recurso, recursoId, accion, resultado, usuarioId, desde, hasta } = {}) {
  var where = []
  var params = []
  agregarFiltro(where, params, 'recurso = ?', recurso)
  if (recursoId != null && recursoId !== '') {
    agregarFiltro(where, params, 'recurso_id = ?', Number(recursoId))
  }
  agregarFiltro(where, params, 'accion = ?', accion)
  agregarFiltro(where, params, 'resultado = ?', resultado)
  if (usuarioId != null && usuarioId !== '') {
    agregarFiltro(where, params, 'usuario_id = ?', Number(usuarioId))
  }
  agregarFiltro(where, params, 'fecha >= ?', desde)
  agregarFiltro(where, params, 'fecha <= ?', hasta)
  return { whereSql: where.length ? 'WHERE ' + where.join(' AND ') : '', params }
}

// Lectura (para evidencias/pruebas): lista las auditorías con filtros y paginación.
export async function listarAuditoria({
  recurso,
  recursoId,
  accion,
  resultado,
  usuarioId,
  desde,
  hasta,
  limite = 200,
  offset = 0,
} = {}) {
  var limiteNum = Math.min(Math.max(Number(limite) || 200, 1), 10000)
  var offsetNum = Math.max(Number(offset) || 0, 0)
  var { whereSql, params } = construirFiltros({
    recurso, recursoId, accion, resultado, usuarioId, desde, hasta,
  })

  var total = await ejecutarConsulta(
    `SELECT COUNT(*)::int AS n FROM auditoria_logs ${whereSql}`,
    params
  )
  var conteosRows = await ejecutarConsulta(
    `SELECT resultado, COUNT(*)::int AS n FROM auditoria_logs ${whereSql} GROUP BY resultado`,
    params
  )
  var conteos = { exito: 0, fallido: 0, omitido: 0 }
  for (var fila of conteosRows.rows) {
    if (conteos[fila.resultado] != null) conteos[fila.resultado] = fila.n
  }

  var paramsFilas = params.slice()
  paramsFilas.push(limiteNum, offsetNum)
  var r = await ejecutarConsulta(
    `SELECT id, usuario_id, usuario_nombre, accion, recurso, recurso_id, detalle, resultado, ip, fecha
     FROM auditoria_logs ${whereSql}
     ORDER BY fecha DESC, id DESC
     LIMIT $${paramsFilas.length - 1} OFFSET $${paramsFilas.length}`,
    paramsFilas
  )
  return { total: total.rows[0].n, registros: r.rows, conteos }
}

function csvEscape(valor) {
  if (valor == null) return ''
  var s = valor instanceof Date ? valor.toISOString() : String(valor)
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export async function exportarCsvAuditoria(filtros = {}) {
  var { registros } = await listarAuditoria({ ...filtros, limite: 10000, offset: 0 })
  var encabezado = ['id', 'fecha', 'usuario_id', 'usuario_nombre', 'accion', 'recurso', 'recurso_id', 'detalle', 'resultado', 'ip']
  var lineas = [encabezado.join(',')]
  for (var fila of registros) {
    lineas.push([
      csvEscape(fila.id),
      csvEscape(fila.fecha),
      csvEscape(fila.usuario_id),
      csvEscape(fila.usuario_nombre),
      csvEscape(fila.accion),
      csvEscape(fila.recurso),
      csvEscape(fila.recurso_id),
      csvEscape(fila.detalle),
      csvEscape(fila.resultado),
      csvEscape(fila.ip),
    ].join(','))
  }
  return { csv: lineas.join('\n') + '\n', total: registros.length }
}
