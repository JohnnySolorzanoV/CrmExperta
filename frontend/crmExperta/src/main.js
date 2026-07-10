import { createApp } from 'vue'
import './style.scss'
import App from './App.vue'
import { router } from './rutas.js'
import "bootstrap"
import {createPinia} from 'pinia'
import { useUsuarioStore } from './stores/usuariostore'
import { setUnauthorizedHandler } from './utils/api'

const pinia = createPinia()
const MENSAJE_SESION_EXPIRADA = 'Tu sesion expiro o es invalida. Inicia sesion nuevamente.'

setUnauthorizedHandler((motivo = MENSAJE_SESION_EXPIRADA) => {
  const usuarioStore = useUsuarioStore()
  if (!usuarioStore.token && !usuarioStore.usuario) return
  usuarioStore.expirarSesion(motivo)
  if (router.currentRoute.value.path !== '/loginPerfil') {
    router.push('/loginPerfil')
  }
})

createApp(App)
.use(pinia)
.use(router)
.mount('#app')
