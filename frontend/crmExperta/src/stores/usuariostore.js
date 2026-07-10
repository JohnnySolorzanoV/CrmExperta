import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch, buildApiUrl } from '../utils/api';

export const useUsuarioStore = defineStore('usuario', () => {
    const STORAGE_USUARIO = 'crm_usuario';
    const STORAGE_TOKEN = 'crm_token';
    const usuario = ref(null);
    const token = ref(null);
    const cargando = ref(false);
    const error = ref(null);
    const MENSAJE_SESION_EXPIRADA = 'Tu sesion expiro o es invalida. Inicia sesion nuevamente.';

    function decodificarPayloadJwt(tokenJwt) {
        if (!tokenJwt || typeof tokenJwt !== 'string') return null;
        const segmentos = tokenJwt.split('.');
        if (segmentos.length < 2) return null;
        try {
            const base64Url = segmentos[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const padding = '='.repeat((4 - (base64.length % 4)) % 4);
            const decodificado = atob(base64 + padding);
            return JSON.parse(decodificado);
        } catch {
            return null;
        }
    }

    function tokenExpirado(tokenJwt = token.value) {
        const payload = decodificarPayloadJwt(tokenJwt);
        const exp = payload?.exp;
        if (!Number.isFinite(exp)) return true;
        return exp * 1000 <= Date.now();
    }

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
            if (tokenExpirado(tokenGuardado)) {
                expirarSesion(MENSAJE_SESION_EXPIRADA);
                return;
            }
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

    function expirarSesion(motivo = MENSAJE_SESION_EXPIRADA) {
        usuario.value = null;
        token.value = null;
        error.value = motivo;
        persistirSesion();
    }

    function verificarSesion() {
        if (!token.value) return true;
        const expirada = tokenExpirado(token.value);
        if (!expirada) return true;
        expirarSesion(MENSAJE_SESION_EXPIRADA);
        return false;
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
                if (!verificarSesion()) return false;
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

    async function solicitarRecuperacionContrasena(correo) {
        const response = await apiFetch('/auth/recuperar-contrasena', {
            method: 'POST',
            body: JSON.stringify({ correo }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.error || data?.mensaje || 'No se pudo solicitar la recuperacion de contraseña.');
        }
        return data;
    }

    async function restablecerContrasena(tokenReset, nuevaContrasena) {
        const response = await apiFetch('/auth/restablecer-contrasena', {
            method: 'POST',
            body: JSON.stringify({ token: tokenReset, nuevaContrasena }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.error || data?.mensaje || 'No se pudo restablecer la contraseña.');
        }
        return { success: true, data };
    }

    return {
        usuario,
        iniciarSesion,
        cargando,
        error,
        token,
        cerrarSesion,
        expirarSesion,
        verificarSesion,
        tokenExpirado,
        MENSAJE_SESION_EXPIRADA,
        solicitarRecuperacionContrasena,
        restablecerContrasena
    };
});

