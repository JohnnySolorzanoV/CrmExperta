import express from 'express'
import { default as corsMod } from 'cors'
import './config/env.js'
import { probarConexion, iniciarConexionConReintentos, cerrarConexiones } from './config/database.js'
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
import { iniciarSchedulerRecordatorios } from './modulos/citas/cita.recordatorios.js'

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

export async function iniciarServidor() {
  try {
    await iniciarConexionConReintentos()
    iniciarSchedulerRecordatorios()
    var servidor = APP.listen(PUERTO, () => {
      log.info('SERVIDOR_INICIADO', { puerto: PUERTO })
    })
    registrarApagado(servidor)
  } catch (e) {
    log.error('SERVIDOR_INICIO_ERR', { err: e })
    process.exit(1)
  }
}

function registrarApagado(servidor) {
  var detener = () => {
    log.info('APAGADO_INICIADO', {})
    servidor.close(async () => {
      await cerrarConexiones()
      process.exit(0)
    })
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGTERM', detener)
  process.on('SIGINT', detener)
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
