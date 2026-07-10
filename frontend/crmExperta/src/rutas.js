import { createWebHistory, createRouter } from 'vue-router'
import { useUsuarioStore } from './stores/usuariostore'
import frontendCRM from './components/frontendCRM.vue'
import inicio from './components/inicio.vue'
import admin from './components/admin.vue'
import loginPerfil from './components/loginPerfil.vue'
import crearPerfil from './components/crearPerfil.vue'
import recuperarContrasena from './components/recuperarContrasena.vue'
import resetContrasena from './components/resetContrasena.vue'
import abogados from './components/abogados.vue'
import citas from './components/citas.vue'
import documentos from './components/documentos.vue'
import chatbot from './components/chatbot.vue'
import inicioAbogado from './components/inicioAbogado.vue'
import misReservas from './components/misReservas.vue'
import sobreNosotros from './components/sobreNosotros.vue'
import casoDetalle from './components/casoDetalle.vue'
import casoDetalleCliente from './components/casoDetalleCliente.vue'
const rutas = [
    {
        path: '/',
        redirect: '/inicio'
    },
    {
        path: '/frontendCRM',
        component: frontendCRM
    },
    {
        path: '/inicio',
        component: inicio,
        meta: { publica: true }
    },
    {
        path: '/sobre-nosotros',
        component: sobreNosotros,
        meta: { publica: true }
    },
    // Rutas publicas
    {
        path: '/loginPerfil',
        component: loginPerfil,
        meta: { publica: true, soloInvitado: true }
    },
    {
        path: '/crearPerfil',
        component: crearPerfil,
        meta: { publica: true, soloInvitado: true }
    },
    {
        path: '/recuperarContrasena',
        component: recuperarContrasena,
        meta: { publica: true, soloInvitado: true }
    },
    {
        path: '/reset-contrasena/:token',
        component: resetContrasena,
        meta: { publica: true }
    },
    // Rutas admin
    {
        path: '/admin',
        component: admin,
        meta: { rol: 'administrador' }
    },
    // Rutas abogado
    {
        path: '/inicioAbogado',
        component: inicioAbogado,
        meta: { rol: 'abogado' }
    },
    {
        path: '/casos/:id',
        component: casoDetalle,
        meta: { rol: 'abogado' }
    },
    {
        path: '/abogados',
        component: abogados
    },
    {
        path: '/citas',
        component: citas,
        meta: { rol: 'abogado' }
    },
    // Rutas cliente
    {
        path: '/chatbot',
        component: chatbot,
        meta: { rol: 'cliente' }
    },
    {
        path: '/mis-reservas',
        component: misReservas,
        meta: { rol: 'cliente' }
    },
    {
        path: '/mis-casos/:id',
        component: casoDetalleCliente,
        meta: { rol: 'cliente' }
    },
    {
        path: '/documentos',
        component: documentos
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/inicio'
    }
];
export const router = createRouter({
    history: createWebHistory(),
    routes: rutas
})

const RUTA_POR_ROL = {
    administrador: '/admin',
    abogado: '/citas',
    cliente: '/chatbot'
}

function obtenerRutaPorRol(usuario) {
    const roles = usuario?.roles || []
    if (roles.includes('administrador')) return RUTA_POR_ROL.administrador
    if (roles.includes('abogado')) return RUTA_POR_ROL.abogado
    if (roles.includes('cliente')) return RUTA_POR_ROL.cliente
    return '/loginPerfil'
}

router.beforeEach((to) => {
    const usuarioStore = useUsuarioStore()
    const sesionValida = usuarioStore.verificarSesion()
    const usuario = usuarioStore.usuario
    const rutaDestinoRol = obtenerRutaPorRol(usuario)
    const esRutaPublica = Boolean(to.meta?.publica)

    if (!sesionValida) {
        if (esRutaPublica || to.path === '/loginPerfil') return true
        return '/loginPerfil'
    }

    if (!usuario) {
        if (esRutaPublica) return true
        return '/loginPerfil'
    }

    if (esRutaPublica) {
        if (to.meta?.soloInvitado) return rutaDestinoRol
        return true
    }

    // Si ya esta autenticado, el landing general redirige al home de su rol.
    if (to.path === '/inicio' || to.path === '/frontendCRM') return rutaDestinoRol

    const rolRequerido = to.meta?.rol
    if (rolRequerido && !usuario.roles?.includes(rolRequerido)) return rutaDestinoRol

    return true
})