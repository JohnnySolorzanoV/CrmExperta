import { ref, computed, watch } from 'vue'
import { useChatbotStore } from '../stores/chatbotStore'
import { mapSlotsToCalendarItems } from '../utils/calendarGrid'

/**
 * Encapsulates the lawyer-selection → availability calendar → confirm booking flow
 * that appears inside the chatbot when a scheduling intent is detected.
 */
export function useChatbotScheduling() {
  const store = useChatbotStore()

  const abogadoSeleccionado = ref('')
  const slotSeleccionadoKey = ref('')
  const paso = ref(1) // 1 = pick lawyer, 2 = pick slot on calendar
  const enviando = ref(false)
  const cargandoDisponibilidad = ref(false)
  const errorReserva = ref('')

  const abogados = computed(() => store.abogadosDisponibles)
  const calendarItems = computed(() => mapSlotsToCalendarItems(store.disponibilidadAbogado))
  const pendienteAgendar = computed(() => store.pendienteAgendar)

  // Reset state whenever a new scheduling intent arrives from the bot
  watch(pendienteAgendar, (pendiente) => {
    if (pendiente) {
      paso.value = 1
      slotSeleccionadoKey.value = ''
      errorReserva.value = ''
    }
  })

  async function cargarDisponibilidad() {
    errorReserva.value = ''
    slotSeleccionadoKey.value = ''
    if (!abogadoSeleccionado.value) {
      errorReserva.value = 'Primero selecciona un abogado.'
      return
    }
    try {
      cargandoDisponibilidad.value = true
      await store.cargarDisponibilidadAbogado(abogadoSeleccionado.value)
      if (store.disponibilidadAbogado.length === 0) {
        errorReserva.value = 'Este abogado no tiene horarios disponibles en sus próximos slots.'
      }
      paso.value = 2
    } catch (e) {
      errorReserva.value = e.message || 'No se pudo cargar la disponibilidad.'
    } finally {
      cargandoDisponibilidad.value = false
    }
  }

  async function confirmarReserva() {
    errorReserva.value = ''
    if (!abogadoSeleccionado.value) {
      errorReserva.value = 'Selecciona un abogado.'
      return
    }
    if (!slotSeleccionadoKey.value) {
      errorReserva.value = 'Selecciona uno de los horarios disponibles en el calendario.'
      return
    }

    try {
      enviando.value = true

      // Re-fetch availability right before confirming to work with the freshest slot state
      await store.cargarDisponibilidadAbogado(abogadoSeleccionado.value)

      const slot = store.disponibilidadAbogado.find(
        (s) => String(s.id != null ? s.id : s.fechaEvento) === String(slotSeleccionadoKey.value)
      )
      if (!slot) {
        slotSeleccionadoKey.value = ''
        errorReserva.value = 'El horario seleccionado ya no está disponible. Por favor elige otro.'
        return
      }

      await store.confirmarAgendamiento(slot.fechaEvento, abogadoSeleccionado.value, slot.id ?? null)
      abogadoSeleccionado.value = ''
      slotSeleccionadoKey.value = ''
      paso.value = 1
    } catch (e) {
      const esConflicto =
        e.message?.includes('ya tiene una cita') ||
        e.message?.includes('ya esta reservado') ||
        e.message?.includes('ya está reservado')
      if (esConflicto) {
        slotSeleccionadoKey.value = ''
        // Refresh slots so the grid reflects the now-taken hour
        await store.cargarDisponibilidadAbogado(abogadoSeleccionado.value).catch(() => {})
        errorReserva.value = 'Ese horario acaba de ser reservado. Por favor elige otro horario disponible.'
      } else {
        errorReserva.value = e.message || 'No se pudo confirmar la cita.'
      }
    } finally {
      enviando.value = false
    }
  }

  function cancelar() {
    store.limpiarPendienteAgendar()
    abogadoSeleccionado.value = ''
    slotSeleccionadoKey.value = ''
    errorReserva.value = ''
    paso.value = 1
  }

  function volverPasoUno() {
    paso.value = 1
    slotSeleccionadoKey.value = ''
    errorReserva.value = ''
  }

  return {
    abogadoSeleccionado,
    slotSeleccionadoKey,
    paso,
    enviando,
    cargandoDisponibilidad,
    errorReserva,
    abogados,
    calendarItems,
    pendienteAgendar,
    cargarDisponibilidad,
    confirmarReserva,
    cancelar,
    volverPasoUno,
  }
}
