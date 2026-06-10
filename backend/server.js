import express from 'express'
import { default as corsMod } from 'cors'
import { config as envConfig } from 'dotenv'
import { probarConexion } from './config/database.js'
import { manejoDeErrores } from './config/manejoDeErrores.js'
import authRutas from './modulos/auth/auth.rutas.js'
import usuarioRutas from './modulos/usuarios/usuario.rutas.js'
import abogadoRutas from './modulos/abogados/abogado.rutas.js'
import calendarioRutas from './modulos/calendario/calendario.rutas.js'
import citaRutas from './modulos/citas/cita.rutas.js'
import casoRutas from './modulos/casos/caso.rutas.js'
import documentoRutas from './modulos/documentos/documento.rutas.js'
import chatbotRutas from './modulos/chatbot/chatbot.rutas.js'

envConfig()

const APP = express()
var PUERTO = process.env.PORT || 3000

APP.use(corsMod())
APP.use(express.json())

var MODULOS_ACTIVOS = [
  { ruta: '/api/auth', handler: authRutas },
  { ruta: '/api/usuarios', handler: usuarioRutas },
  { ruta: '/api/abogados', handler: abogadoRutas },
  { ruta: '/api/calendario', handler: calendarioRutas },
  { ruta: '/api/citas', handler: citaRutas },
  { ruta: '/api/casos', handler: casoRutas },
  { ruta: '/api/documentos', handler: documentoRutas },
  { ruta: '/api/chatbot', handler: chatbotRutas },
]

for (var mod of MODULOS_ACTIVOS) {
  APP.use(mod.ruta, mod.handler)
}

APP.use(manejoDeErrores)

async function iniciar() {
    await probarConexion()
    APP.listen(PUERTO, () => {
      console.log('Servidor en http://localhost:' + PUERTO)
    })
}

try {
  iniciar()
} catch (e) {
  console.error('error al iniciar:', e.message)
  process.exit(1)
}
