import express from 'express'
import { default as corsMod } from 'cors'
import { config as envConfig } from 'dotenv'
import { probarConexion } from './config/database.js'
import { manejoDeErrores } from './config/manejoDeErrores.js'
import authRutas from './modulos/auth/auth.rutas.js'
import clienteRutas from './modulos/clientes/cliente.rutas.js'
import usuarioRutas from './modulos/usuarios/usuario.rutas.js'
import abogadoRutas from './modulos/abogados/abogado.rutas.js'
import calendarioRutas from './modulos/calendario/calendario.rutas.js'
import citaRutas from './modulos/citas/cita.rutas.js'
import casoRutas from './modulos/casos/caso.rutas.js'
import documentoRutas from './modulos/documentos/documento.rutas.js'
import chatbotRutas from './modulos/chatbot/chatbot.rutas.js'

envConfig()

export const APP = express()
var PUERTO = process.env.PORT || 3000
var API_PREFIX = normalizarPrefijoApi(process.env.API_PREFIX)

APP.use(corsMod())
APP.use(express.json())

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

APP.use(manejoDeErrores)

export async function iniciarServidor() {
  try {
    await probarConexion()
    APP.listen(PUERTO, () => {
      console.log('Servidor corriendo en ' + PUERTO)
    })
  } catch (e) {
    console.error('error al iniciar:', e.message)
    process.exit(1)
  }
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
