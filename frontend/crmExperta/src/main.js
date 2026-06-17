import { createApp } from 'vue'
import './style.scss'
import App from './App.vue'
import { router } from './rutas.js'
import "bootstrap"
import {createPinia} from 'pinia'

const pinia = createPinia()

createApp(App)
.use(pinia)
.use(router)
.mount('#app')
