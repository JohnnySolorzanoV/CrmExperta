import { ref, computed } from 'vue'
import { useChatbotStore } from '../stores/chatbotStore'

/**
 * Handles the pure chat message flow (send, receive, display).
 * Scheduling confirmation lives in useChatbotScheduling.
 */
export function useChatbotConversation() {
  const store = useChatbotStore()
  const mensajeInput = ref('')

  const mensajes = computed(() => store.mensajes)
  const cargando = computed(() => store.cargando)
  const pendienteAgendar = computed(() => store.pendienteAgendar)
  const ultimaCita = computed(() => store.ultimaCita)
  const errorChat = computed(() => store.error)

  /**
   * Returns the visible text for a bot message, hiding raw JSON scheduling
   * payloads and replacing them with a friendly phrase.
   */
  function textoBotVisible(msg) {
    const respuesta = msg?.content?.respuesta
    if (!respuesta) return ''
    if (typeof respuesta !== 'string') return String(respuesta)

    const candidatos = [respuesta]
    const match = respuesta.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (match?.[1]) candidatos.push(match[1])

    for (const texto of candidatos) {
      try {
        const parsed = JSON.parse(texto.trim())
        if (parsed?.accion === 'agendar' && parsed?.resumen) {
          return 'Perfecto, tengo la información para agendar tu cita. Completa el formulario.'
        }
      } catch { /* not JSON, keep going */ }
    }
    return respuesta
  }

  async function enviar() {
    if (store.pendienteAgendar) return
    const txt = mensajeInput.value?.trim()
    if (!txt) return
    mensajeInput.value = ''
    await store.enviarMensaje(txt)
  }

  async function agendarRapido() {
    if (store.pendienteAgendar) return
    mensajeInput.value = ''
    await store.enviarMensaje('agendar cita')
  }

  return {
    mensajeInput,
    mensajes,
    cargando,
    pendienteAgendar,
    ultimaCita,
    errorChat,
    textoBotVisible,
    enviar,
    agendarRapido,
  }
}
