import { createMemoryHistory, createRouter } from 'vue-router'
import frontendCRM from './components/frontendCRM.vue'
import inicioCRM from './components/inicioCRM.vue'
import admin from './components/admin.vue'
import loginPerfil from './components/loginPerfil.vue'
import crearPerfil from './components/crearPerfil.vue'
import recuperarContrasena from './components/recuperarContrasena.vue'
import abogados from './components/abogados.vue'
import citas from './components/citas.vue'
import documentos from './components/documentos.vue'
import chatbot from './components/chatbot.vue'
const rutas = [
    {
        path: '/frontendCRM',
        component: frontendCRM
    },
    {
        path: '/inicioCRM',
        component: inicioCRM
    },
    {
        path: '/admin',
        component: admin
    },
    {
        path: '/loginPerfil',
        component: loginPerfil
    },
    {
        path: '/crearPerfil',
        component: crearPerfil
    },
    {
        path: '/recuperarContrasena',
        component: recuperarContrasena
    },
    {
        path: '/abogados',
        component: abogados
    },
    {
        path: '/citas',
        component: citas
    },
    {
        path: '/documentos',
        component: documentos
    },
    {
        path: '/chatbot',
        component: chatbot
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/frontendCRM'
    }
];
export const router = createRouter({
    history: createMemoryHistory(),
    routes: rutas
})