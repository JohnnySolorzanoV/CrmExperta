import { log } from './logger.js'
import { auditarIntentoFallido } from '../modulos/auditoria/auditoria.servicio.js'

export async function manejoDeErrores(err, req, res, next) {
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

  // Todo intento fallido sobre la API queda registrado con resultado='fallido'.
  // Nunca se silencia: si el registro falla se deja constancia en el log.
  var ruta = req.originalUrl || req.url || ''
  if (ruta.startsWith('/api')) {
    try {
      // Se espera el INSERT para que la respuesta y el registro sean
      // consistentes; un fallo del log nunca silencia el error original.
      await auditarIntentoFallido(req, err)
    } catch (e) {
      log.error('AUDITORIA_ERR', { err: e?.message, contexto: 'intento fallido en error handler' })
    }
  }

  res.status(codigo).json({
    error: err.message || 'Error interno'
  })
}
