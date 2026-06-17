import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUsuarioStore } from './usuariostore';

export const useChatbotStore = defineStore('chatbot', () => {
    const mensajes = ref([]);
    const cargando = ref(false);
    const error = ref(false);
    const usuarioStore = useUsuarioStore();

    async function enviarMensaje(mensaje) {
        cargando.value = true;
        error.value = false;
        console.log(usuarioStore.usuario.id, usuarioStore.token)
        try {
            mensajes.value.push({ role: 'user', content: mensaje }) 
            
            const response = await fetch("http://localhost:3000/api/chatbot/consultar", {
                method: "POST",
                body: JSON.stringify({ idUsuario: usuarioStore.usuario.id, mensaje }),
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${usuarioStore.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    mensajes.value.push({ role: "bot", content: data });
                }
            }
        } catch (err) {
            console.log("Error al recibir mensaje:", err);
            error.value = true;
        } finally {
            cargando.value = false;
        }
    }

    return { mensajes, cargando, error, enviarMensaje };
});