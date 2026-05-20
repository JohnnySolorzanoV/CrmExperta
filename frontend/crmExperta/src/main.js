import { createApp } from 'vue'
import './style.scss'
import App from './App.vue'
import { router } from './rutas.js'
import "bootstrap"

createApp(App)
.use(router)
.mount('#app')
