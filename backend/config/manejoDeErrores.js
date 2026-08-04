import { log } from './logger.js'

export function manejoDeErrores(err, req, res, next) {
  var requestId = req.requestId
  var codigo = err.status || 500
  var esCliente = codigo >= 400 && codigo < 500
  var nivel = esCliente ? 'warn' : 'error'
  log[nivel]('ERROR', {
    requestId,
    metodo: req.method,
    ruta: req.originalUrl || req.url,
    status: codigo,
    err: { code: err.code, message: err.message },
  })
  res.status(codigo).json({
    error: err.message || 'Error interno'
  })
}
