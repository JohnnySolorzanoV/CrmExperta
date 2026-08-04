import crypto from 'crypto'

// Logger técnico estructurado: emite una línea JSON por evento a stdout.
// NUNCA debe imprimir secretos (contraseñas, tokens, contenido legal o del chatbot).
// Formato de cada línea: { level, ts, event, ...contexto }

var CAMPOS_SENSIBLES = ['password', 'contrasena', 'token', 'reset_token', 'hash', 'pass', 'clave', 'poe_api_key', 'authorization']

function normalizarError(err) {
  if (!err) return undefined
  if (err instanceof Error) {
    return { code: err.code, message: err.message || 'Error desconocido' }
  }
  if (typeof err === 'object') return err
  return { message: String(err) }
}

function redactarData(data) {
  var copia = {}
  for (var k of Object.keys(data || {})) {
    if (CAMPOS_SENSIBLES.includes(k.toLowerCase())) {
      copia[k] = '[REDACTED]'
    } else {
      copia[k] = data[k]
    }
  }
  if (copia.err !== undefined) copia.err = normalizarError(copia.err)
  return copia
}

function escribir(nivel, evento, data) {
  var linea = { level: nivel, ts: new Date().toISOString(), event: evento, ...redactarData(data) }
  var texto
  try {
    texto = JSON.stringify(linea)
  } catch (_) {
    texto = JSON.stringify({ level: nivel, ts: new Date().toISOString(), event: evento, aviso: 'contexto no serializable' })
  }
  if (nivel === 'error') console.error(texto)
  else console.log(texto)
}

function nuevoLogger() {
  return {
    debug: (e, d) => escribir('debug', e, d),
    info: (e, d) => escribir('info', e, d),
    warn: (e, d) => escribir('warn', e, d),
    error: (e, d) => escribir('error', e, d),
  }
}

const log = nuevoLogger()

// Middleware: asigna requestId y registra cada petición HTTP en una línea JSON.
export function requestLogger() {
  return function (req, res, next) {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID()
    var inicio = Date.now()

    res.on('finish', function () {
      var usuario
      if (req.usuario) {
        usuario = {
          id: req.usuario.id,
          rol: Array.isArray(req.usuario.roles) ? req.usuario.roles.join(',') : 'anonimo'
        }
      }
      log.info('HTTP_REQUEST', {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        ms: Date.now() - inicio,
        user: usuario,
      })
    })
    next()
  }
}

export { log }