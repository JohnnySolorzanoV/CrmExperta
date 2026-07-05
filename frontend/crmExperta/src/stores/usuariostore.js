import { defineStore } from 'pinia';
import { ref } from 'vue';
import { buildApiUrl } from '../utils/api';

export const useUsuarioStore = defineStore('usuario', () => {
    const STORAGE_USUARIO = 'crm_usuario';
    const STORAGE_TOKEN = 'crm_token';
    const usuario = ref(null);
    const token = ref(null);
    const cargando = ref(false);
    const error = ref(null);

    function persistirSesion() {
        if (usuario.value && token.value) {
            localStorage.setItem(STORAGE_USUARIO, JSON.stringify(usuario.value));
            localStorage.setItem(STORAGE_TOKEN, token.value);
            return;
        }
        localStorage.removeItem(STORAGE_USUARIO);
        localStorage.removeItem(STORAGE_TOKEN);
    }

    function hidratarSesion() {
        const usuarioGuardado = localStorage.getItem(STORAGE_USUARIO);
        const tokenGuardado = localStorage.getItem(STORAGE_TOKEN);
        if (!usuarioGuardado || !tokenGuardado) return;

        try {
            usuario.value = JSON.parse(usuarioGuardado);
            token.value = tokenGuardado;
        } catch {
            localStorage.removeItem(STORAGE_USUARIO);
            localStorage.removeItem(STORAGE_TOKEN);
            usuario.value = null;
            token.value = null;
        }
    }

    function cerrarSesion() {
        usuario.value = null;
        token.value = null;
        error.value = null;
        persistirSesion();
    }

    hidratarSesion();

    async function iniciarSesion(correo, contrasena) {
        cargando.value = true;
        error.value = null;
        cerrarSesion();

        try {
            const response = await fetch(buildApiUrl('/auth/login'), {
                method: "POST",
                body: JSON.stringify({ correo, contrasena }),
                headers: { "Content-Type": "application/json" }
            });

            const data = await response.json();

            if (!response.ok) {
                const mensajeBackend = data?.error || data?.mensaje;
                error.value = typeof mensajeBackend === 'string' && mensajeBackend.trim().length > 0
                    ? mensajeBackend
                    : 'No se pudo iniciar sesión. Verifica tus credenciales.';
                return false;
            }

            if (data.token && data.usuario) {
                usuario.value = data.usuario;
                token.value = data.token;
                persistirSesion();
                return true;
            }

            error.value = 'Respuesta inválida del servidor.';
            return false;
        } catch (err) {
            console.log("Error al iniciar sesión:", err);
            error.value = 'Error de conexión con el servidor.';
            return false;
        } finally {
            cargando.value = false;
        }
    }

    return { usuario, iniciarSesion, cargando, error, token, cerrarSesion };
});

