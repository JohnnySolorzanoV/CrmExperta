export function manejoDeErrores(err, req, res, next) {
  console.log('ERROR_DETECTADO:', err.message)
  var codigodeErr = err.status || 500
  res.status(codigodeErr).json({
    error: err.message || 'Error interno'
  })
}
