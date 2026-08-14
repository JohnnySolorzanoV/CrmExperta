import { Router } from 'express'
import { verificarToken, verificarRol } from '../../config/autenticacion.js'
import { listarAuditoria, exportarCsvAuditoria, registrarAuditoria } from './auditoria.servicio.js'
import { log } from '../../config/logger.js'

var router = Router()

function filtrosDesdeQuery(query) {
  return {
    desde: query.desde || undefined,
    hasta: query.hasta || undefined,
    accion: query.accion || undefined,
    recurso: query.recurso || undefined,
    resultado: query.resultado || undefined,
    usuarioId: query.usuario_id || undefined,
    recursoId: query.recurso_id || undefined,
    limite: query.limite,
    offset: query.offset,
  }
}

function fechaArchivo(valor, fallback) {
  if (!valor) return fallback
  var d = new Date(valor)
  if (Number.isNaN(d.getTime())) return fallback
  var y = d.getUTCFullYear()
  var m = String(d.getUTCMonth() + 1).padStart(2, '0')
  var day = String(d.getUTCDate()).padStart(2, '0')
  return '' + y + m + day
}

router.get('/', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var datos = await listarAuditoria(filtrosDesdeQuery(req.query))
    res.json(datos)
  } catch (error) { next(error) }
})

router.get('/export.csv', verificarToken, verificarRol('administrador'), async (req, res, next) => {
  try {
    var filtros = filtrosDesdeQuery(req.query)
    var { csv, total } = await exportarCsvAuditoria(filtros)
    await registrarAuditoria({
      req,
      accion: 'EXPORTAR',
      recurso: 'Auditoria',
      detalle: 'exportacion CSV (' + total + ' filas) desde=' + (filtros.desde || '') + ' hasta=' + (filtros.hasta || '')
    }).catch(e => log.error('AUDITORIA_ERR', { err: e.message, contexto: 'exportacion auditoria' }))

    var desdeNom = fechaArchivo(filtros.desde, 'inicio')
    var hastaNom = fechaArchivo(filtros.hasta, 'fin')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="auditoria-' + desdeNom + '-' + hastaNom + '.csv"')
    res.send(csv)
  } catch (error) { next(error) }
})

export default router
