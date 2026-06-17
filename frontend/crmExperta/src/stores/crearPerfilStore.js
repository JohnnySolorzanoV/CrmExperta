import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCrearPerfilStore = defineStore('crearPerfil', () => {
    const cargando = ref(false);
    const error = ref(false);
    const usuario = ref(null);

    async function crearPerfil(identificacion, nombre, correo, contrasena) {
        cargando.value = true;
        error.value = false;
        usuario.value = null;
        try {
            const response = await fetch("http://localhost:3000/api/usuarios", {
                method: "POST",
                body: JSON.stringify({ identificacion, nombre, correo, contrasena }),
                headers: { "Content-Type": "application/json" }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.usuario) {
                    usuario.value = data.usuario;
                }
            }
        } catch (err) {
            console.log("Error al crear perfil:", err);
            error.value = true;
        } finally {
            cargando.value = false;
        }
    }

    return { usuario, crearPerfil, cargando, error };
});