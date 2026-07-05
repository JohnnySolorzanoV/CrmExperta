import { defineStore } from 'pinia';
import { ref } from 'vue';
import { buildApiUrl } from '../utils/api';

export const useCrearPerfilStore = defineStore('crearPerfil', () => {
    const cargando = ref(false);
    const error = ref(null);
    const usuario = ref(null);

    async function crearPerfil({ identificacion, nombre, correo, contrasena, direccion, telefono }) {
        cargando.value = true;
        error.value = null;
        usuario.value = null;
        try {
            const response = await fetch(buildApiUrl('/clientes/registro'), {
                method: "POST",
                body: JSON.stringify({ identificacion, nombre, correo, contrasena, direccion, telefono }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await response.json();
            if (!response.ok) {
                error.value = data?.error || data?.mensaje || 'No se pudo registrar el cliente.';
                return false;
            }

            if (data.usuario) {
                usuario.value = data.usuario;
                return true;
            }

            error.value = 'Respuesta inválida del servidor.';
            return false;
        } catch (err) {
            console.log("Error al crear perfil:", err);
            error.value = 'Error de conexión con el servidor.';
            return false;
        } finally {
            cargando.value = false;
        }
    }

    return { usuario, crearPerfil, cargando, error };
});