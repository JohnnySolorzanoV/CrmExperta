import { createMemoryHistory, createRouter } from 'vue-router'
import frontendCRM from './components/frontendCRM.vue'
import inicioCRM from './components/inicioCRM.vue'
import admin from './components/admin.vue'
import loginPerfil from './components/loginPerfil.vue'
import crearPerfil from './components/crearPerfil.vue'
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
        path: '/:pathMatch(.*)*',
        redirect: '/frontendCRM'
    }
];
export const router = createRouter({
    history: createMemoryHistory(),
    routes: rutas
})