import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUsuarioStore = defineStore('usuario', () => {
    const usuario = ref(null);
    const token = ref(null);
    const cargando = ref(false);
    const error = ref(false);
    async function iniciarSesion(correo, contrasena) {
        cargando.value = true;
        error.value = false;
        usuario.value = null;
        token.value = null;

        try {
            const response = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ correo, contrasena }),
                headers: { "Content-Type": "application/json" }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.token && data.usuario) {
                    usuario.value = data.usuario;
                    token.value = data.token;
                }
            }
        } catch (err) {
            console.log("Error al iniciar sesión:", err);
            error.value = true;
        } finally {
            cargando.value = false;
        }
    }

    return { usuario, iniciarSesion, cargando, error, token };
});

