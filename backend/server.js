import express from 'express'
import { default as corsMod } from 'cors'
import './config/env.js'
import { iniciarConexionConReintentos, cerrarConexiones } from './config/database.js'
import { manejoDeErrores } from './config/manejoDeErrores.js'
import { requestLogger, log } from './config/logger.js'
import { ejecutarConsulta } from './config/database.js'
import authRutas from './modulos/auth/auth.rutas.js'
import clienteRutas from './modulos/clientes/cliente.rutas.js'
import usuarioRutas from './modulos/usuarios/usuario.rutas.js'
import abogadoRutas from './modulos/abogados/abogado.rutas.js'
import calendarioRutas from './modulos/calendario/calendario.rutas.js'
import citaRutas from './modulos/citas/cita.rutas.js'
import casoRutas from './modulos/casos/caso.rutas.js'
import documentoRutas from './modulos/documentos/documento.rutas.js'
import chatbotRutas from './modulos/chatbot/chatbot.rutas.js'
import auditoriaRutas from './modulos/auditoria/auditoria.rutas.js'
import { iniciarSchedulerRecordatorios } from './modulos/citas/cita.recordatorios.js'
import { iniciarScheduler as iniciarSchedulerNotificaciones } from './modulos/notificacion/notificacion.servicio.js'

export const APP = express()
var PUERTO = process.env.PORT || 3000
var API_PREFIX = normalizarPrefijoApi(process.env.API_PREFIX)

APP.use(corsMod())
APP.use(express.json())
APP.use(requestLogger())

var MODULOS_ACTIVOS = [
  { ruta: '/auth', handler: authRutas },
  { ruta: '/clientes', handler: clienteRutas },
  { ruta: '/usuarios', handler: usuarioRutas },
  { ruta: '/abogados', handler: abogadoRutas },
  { ruta: '/calendario', handler: calendarioRutas },
  { ruta: '/citas', handler: citaRutas },
  { ruta: '/casos', handler: casoRutas },
  { ruta: '/documentos', handler: documentoRutas },
  { ruta: '/chatbot', handler: chatbotRutas },
  { ruta: '/auditoria', handler: auditoriaRutas },
]

for (var mod of MODULOS_ACTIVOS) {
  APP.use(armarRutaApi(mod.ruta), mod.handler)
}

// Salud y disponibilidad. /health: la app responde. /ready: verifica la BD.
APP.get(armarRutaApi('/health'), (req, res) => {
  res.status(200).json({ estado: 'ok', servicio: 'crm-experta-api', timestamp: new Date().toISOString() })
})

APP.get(armarRutaApi('/ready'), async (req, res) => {
  try {
    await ejecutarConsulta('SELECT 1')
    res.status(200).json({ estado: 'ready', baseDatos: 'ok', timestamp: new Date().toISOString() })
  } catch (e) {
    log.error('HEALTH_DB_ERR', { err: e.message })
    res.status(503).json({ estado: 'no_ready', baseDatos: 'indisponible', timestamp: new Date().toISOString() })
  }
})

APP.use(manejoDeErrores)

// Orden obligatorio de arranque:
// validar configuración → crear pool → comprobar PostgreSQL → iniciar scheduler
// → abrir puerto HTTP → registrar servidor iniciado.
// Está prohibido abrir el puerto HTTP antes de completar satisfactoriamente SELECT 1.
var servidorActivo = null
var controladorApagado = null
var apagadoRegistrado = false

export async function iniciarServidor() {
  registrarApagado()

  try {
    var resultado = await iniciarConexionConReintentos({ signal: controladorApagado.signal })

    if (controladorApagado.signal.aborted || !resultado.conectado) {
      log.info('ARRANQUE_CANCELADO', {})
      await cerrarConexiones()
      process.exit(0)
    }

    // PostgreSQL ya respondió (SELECT 1 en probarConexion).
    iniciarSchedulerRecordatorios()
    iniciarSchedulerNotificaciones()

    servidorActivo = APP.listen(PUERTO, () => {
      log.info('SERVIDOR_INICIADO', { puerto: PUERTO })
    })
  } catch (e) {
    if (controladorApagado.signal.aborted) {
      await cerrarConexiones()
      process.exit(0)
    }
    log.error('SERVIDOR_INICIO_ERR', { err: e?.message || e?.code || 'Error desconocido' })
    process.exit(1)
  }
}

function registrarApagado() {
  if (apagadoRegistrado) return
  apagadoRegistrado = true
  controladorApagado = new AbortController()

  var detener = async () => {
    if (controladorApagado.signal.aborted) return
    controladorApagado.abort()
    log.info('APAGADO_INICIADO', {})

    if (servidorActivo) {
      await new Promise((res) => servidorActivo.close(res))
    }
    await cerrarConexiones()
    process.exit(0)
  }

  var desencadenar = () => {
    detener()
    setTimeout(() => process.exit(0), 5000).unref()
  }

  // Un solo manejo de señales (SIGTERM y SIGINT) para todo el ciclo de vida.
  process.on('SIGTERM', desencadenar)
  process.on('SIGINT', desencadenar)
}

var enPruebas = process.env.NODE_ENV === 'test' || process.env.VITEST
if (!enPruebas) {
  iniciarServidor()
}

function normalizarPrefijoApi(prefijo) {
  var valor = (prefijo || '/api').trim()
  if (!valor || valor === '/') return ''
  var conSlashInicial = valor.startsWith('/') ? valor : `/${valor}`
  return conSlashInicial.replace(/\/+$/, '')
}

function armarRutaApi(rutaModulo) {
  return `${API_PREFIX}${rutaModulo}`
}