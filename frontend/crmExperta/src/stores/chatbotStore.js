import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUsuarioStore } from './usuariostore';
import { buildApiUrl } from '../utils/api';

export const useChatbotStore = defineStore('chatbot', () => {
    const mensajes = ref([]);
    const abogadosDisponibles = ref([]);
    const disponibilidadAbogado = ref([]);
    const cargando = ref(false);
    const error = ref(null);
    const pendienteAgendar = ref(null);
    const ultimaCita = ref(null);
    const usuarioStore = useUsuarioStore();
    const MENSAJE_RELOGIN = 'Tu sesion expiro o es invalida. Inicia sesion nuevamente.';

    async function parseResponseSafe(response) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    function asegurarSesionActiva() {
        if (!usuarioStore.token || !usuarioStore.usuario?.id) {
            throw new Error(MENSAJE_RELOGIN);
        }
    }

    function manejarErrorAutenticacion(data) {
        const mensaje = data?.error || data?.mensaje || '';
        const esErrorToken = typeof mensaje === 'string' && mensaje.toLowerCase().includes('token');
        if (esErrorToken) {
            usuarioStore.cerrarSesion();
            throw new Error(MENSAJE_RELOGIN);
        }
        throw new Error(mensaje || 'No autorizado para realizar esta accion.');
    }

    async function agendarDesdeChat(datosAgendar, fechaHoraCopia, idAbogado, idCalendario) {
        asegurarSesionActiva();
        const response = await fetch(buildApiUrl('/chatbot/agendar'), {
            method: "POST",
            body: JSON.stringify({
                idCliente: usuarioStore.usuario.id,
                idAbogado,
                idCalendario,
                resumen: datosAgendar.resumen,
                tipoConsulta: datosAgendar.tipoConsulta,
                motivo: datosAgendar.motivo,
                fechaHoraCopia
            }),
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${usuarioStore.token}` }
        });

        const data = await parseResponseSafe(response);
        if (!response.ok) {
            if (response.status === 401) manejarErrorAutenticacion(data);
            throw new Error(data?.error || data?.mensaje || 'No se pudo agendar la cita desde el chatbot.');
        }
        return data;
    }

    function extraerAgendarDesdeRespuesta(data) {
        if (data?.agendar?.accion === 'agendar' && data?.agendar?.resumen) {
            return data.agendar;
        }

        const respuestaTexto = data?.respuesta;
        if (!respuestaTexto || typeof respuestaTexto !== 'string') return null;

        const candidatos = [respuestaTexto];
        const matchBloqueJson = respuestaTexto.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (matchBloqueJson?.[1]) candidatos.push(matchBloqueJson[1]);

        // Parseo directo del contenido completo.
        for (const contenido of candidatos) {
            try {
                const parsed = JSON.parse(contenido.trim());
                if (parsed?.accion === 'agendar' && parsed?.resumen) return parsed;
            } catch {
                // continuar con siguiente candidato
            }
        }

        // Fallback: extraer objetos JSON embebidos dentro de texto adicional.
        for (const contenido of candidatos) {
            const fragmentos = contenido.match(/\{[\s\S]*?\}/g) || [];
            for (const fragmento of fragmentos) {
                try {
                    const parsedFragmento = JSON.parse(fragmento.trim());
                    if (parsedFragmento?.accion === 'agendar' && parsedFragmento?.resumen) return parsedFragmento;
                } catch {
                    // continuar con siguiente fragmento
                }
            }
        }

        return null;
    }

    async function cargarAbogadosDisponibles() {
        asegurarSesionActiva();
        const response = await fetch(buildApiUrl('/abogados'), {
            headers: { "Authorization": `Bearer ${usuarioStore.token}` }
        });
        const data = await parseResponseSafe(response);
        if (!response.ok) {
            if (response.status === 401) manejarErrorAutenticacion(data);
            throw new Error(data?.error || data?.mensaje || 'No se pudo cargar la lista de abogados.');
        }
        abogadosDisponibles.value = data?.abogados || [];
        return abogadosDisponibles.value;
    }

    async function cargarDisponibilidadAbogado(idAbogadoUsuario) {
        asegurarSesionActiva();
        const response = await fetch(buildApiUrl(`/calendario/abogado/${idAbogadoUsuario}/disponibilidad`), {
            headers: { "Authorization": `Bearer ${usuarioStore.token}` }
        });
        const data = await parseResponseSafe(response);
        if (!response.ok) {
            if (response.status === 401) manejarErrorAutenticacion(data);
            throw new Error(data?.error || data?.mensaje || 'No se pudo cargar disponibilidad del abogado.');
        }
        disponibilidadAbogado.value = data?.disponibilidad || [];
        return disponibilidadAbogado.value;
    }

    async function enviarMensaje(mensaje) {
        asegurarSesionActiva();
        cargando.value = true;
        error.value = null;
        try {
            mensajes.value.push({ role: 'user', content: mensaje }) 
            
            const response = await fetch(buildApiUrl('/chatbot/consultar'), {
                method: "POST",
                body: JSON.stringify({ idUsuario: usuarioStore.usuario.id, mensaje }),
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${usuarioStore.token}` }
            });
            const data = await parseResponseSafe(response);
            if (!response.ok) {
                if (response.status === 401) manejarErrorAutenticacion(data);
                throw new Error(data?.error || data?.mensaje || 'No se pudo consultar el chatbot.');
            }

            const datosAgendar = extraerAgendarDesdeRespuesta(data);
            if (data && !datosAgendar) {
                mensajes.value.push({ role: "bot", content: data });
            }

            if (datosAgendar) {
                pendienteAgendar.value = datosAgendar;
                mensajes.value.push({
                    role: "bot",
                    content: { respuesta: 'Tengo la informacion para agendar. Completa el formulario de confirmacion.' }
                });
            }
        } catch (err) {
            console.log("Error al recibir mensaje:", err);
            error.value = err.message || 'Error al recibir mensaje.';
            mensajes.value.push({ role: "bot", content: { respuesta: error.value } });
        } finally {
            cargando.value = false;
        }
    }

    async function confirmarAgendamiento(fechaHoraCopia, idAbogado, idCalendario, motivoFinal) {
        if (!pendienteAgendar.value) {
            throw new Error('No hay una cita pendiente por agendar.');
        }
        if (!idAbogado) {
            throw new Error('Debes seleccionar un abogado para confirmar la cita.');
        }
        const payload = {
            ...pendienteAgendar.value,
            motivo: motivoFinal || pendienteAgendar.value.motivo
        };
        const agendaResult = await agendarDesdeChat(payload, fechaHoraCopia, idAbogado, idCalendario);
        ultimaCita.value = agendaResult.cita;
        pendienteAgendar.value = null;
        disponibilidadAbogado.value = [];

        const textoAgenda = `Tu cita fue agendada correctamente para el ${new Date(agendaResult.cita.fechaHoraCopia).toLocaleString()}.`;
        mensajes.value.push({ role: "bot", content: { respuesta: textoAgenda } });
        return agendaResult;
    }

    function limpiarPendienteAgendar() {
        pendienteAgendar.value = null;
        disponibilidadAbogado.value = [];
    }


    return {
        mensajes,
        abogadosDisponibles,
        disponibilidadAbogado,
        cargando,
        error,
        pendienteAgendar,
        ultimaCita,
        enviarMensaje,
        confirmarAgendamiento,
        limpiarPendienteAgendar,
        cargarAbogadosDisponibles,
        cargarDisponibilidadAbogado
    };
});