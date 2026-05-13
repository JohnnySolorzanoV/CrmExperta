import 'bootstrap/dist/css/bootstrap.min.css'
import "bootstrap"
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './rutas.js'

createApp(App)
.use(router)
.mount('#app')
