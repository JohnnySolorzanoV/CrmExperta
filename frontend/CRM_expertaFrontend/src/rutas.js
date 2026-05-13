import { createMemoryHistory, createRouter } from 'vue-router'
import frontendCRM from './components/frontendCRM.vue'
import inicioSesionCRM from './components/inicioSesionCRM.vue'
import admin from './components/admin.vue'
const rutas = [
    {
        path: '/frontendCRM',
        component: frontendCRM
    },
    {
        path: '/inicioSesion',
        component: inicioSesionCRM
    },
    {
        path: '/admin',
        component: admin
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