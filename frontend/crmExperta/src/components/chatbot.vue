<script setup>

import { onMounted, ref, watch } from 'vue'
import { useChatbotStore } from '../stores/chatbotStore'
import { useRouter } from 'vue-router'

const chatbotStore = useChatbotStore()
const router = useRouter()
const mensaje = ref('')
const abogadoSeleccionado = ref('')
const slotSeleccionadoKey = ref('')
const pasoAgendar = ref(1)
const enviandoReserva = ref(false)
const cargandoDisponibilidad = ref(false)
const errorReserva = ref('')

function extraerAgendarDesdeTexto(texto) {
  if (!texto || typeof texto !== 'string') return null

  const candidatos = [texto]
  const matchBloqueJson = texto.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (matchBloqueJson?.[1]) candidatos.push(matchBloqueJson[1])

  for (const contenido of candidatos) {
    try {
      const parsed = JSON.parse(contenido.trim())
      if (parsed?.accion === 'agendar' && parsed?.resumen) return parsed
    } catch {
      // Continuar con el siguiente candidato.
    }
  }

  return null
}

function textoBotVisible(mensajeBot) {
  const respuesta = mensajeBot?.content?.respuesta
  const esAgendar = extraerAgendarDesdeTexto(respuesta)
  if (esAgendar) return 'Perfecto, estoy agendando tu cita con esta información.'
  return respuesta
}

async function enviarMensaje() {
  if (chatbotStore.pendienteAgendar) return
  const mensajeUsuario = mensaje.value
  if (!mensajeUsuario?.trim()) return
  mensaje.value = ''

  await chatbotStore.enviarMensaje(mensajeUsuario)
}

async function enviarAgendarRapido() {
  if (chatbotStore.pendienteAgendar) return
  mensaje.value = ''
  await chatbotStore.enviarMensaje('agendar cita')
}

async function confirmarReserva() {
  errorReserva.value = ''
  if (!abogadoSeleccionado.value) {
    errorReserva.value = 'Selecciona un abogado asignado para la cita.'
    return
  }
  if (!slotSeleccionadoKey.value) {
    errorReserva.value = 'Selecciona uno de los horarios disponibles.'
    return
  }
  const slot = chatbotStore.disponibilidadAbogado.find(
    (s) => String(s.id || s.fechaEvento) === String(slotSeleccionadoKey.value)
  )
  if (!slot) {
    errorReserva.value = 'El horario seleccionado ya no está disponible. Vuelve a cargar disponibilidad.'
    return
  }

  try {
    enviandoReserva.value = true
    await chatbotStore.confirmarAgendamiento(
      slot.fechaEvento,
      abogadoSeleccionado.value,
      slot.id || null
    )
    abogadoSeleccionado.value = ''
    slotSeleccionadoKey.value = ''
  } catch (error) {
    errorReserva.value = error.message || 'No se pudo confirmar la cita.'
  } finally {
    enviandoReserva.value = false
  }
}

function verMisReservas() {
  router.push('/mis-reservas')
}

function cancelarAgendamiento() {
  chatbotStore.limpiarPendienteAgendar()
  abogadoSeleccionado.value = ''
  slotSeleccionadoKey.value = ''
  errorReserva.value = ''
  pasoAgendar.value = 1
}

function volverPasoUno() {
  pasoAgendar.value = 1
  slotSeleccionadoKey.value = ''
  errorReserva.value = ''
}

async function cargarDisponibilidad() {
  errorReserva.value = ''
  slotSeleccionadoKey.value = ''
  if (!abogadoSeleccionado.value) {
    errorReserva.value = 'Primero selecciona un abogado.'
    return
  }
  try {
    cargandoDisponibilidad.value = true
    await chatbotStore.cargarDisponibilidadAbogado(abogadoSeleccionado.value)
    if (chatbotStore.disponibilidadAbogado.length === 0) {
      errorReserva.value = 'Este abogado no tiene horarios disponibles en sus proximos 10 slots.'
    }
    pasoAgendar.value = 2
  } catch (e) {
    errorReserva.value = e.message || 'No se pudo cargar la disponibilidad.'
  } finally {
    cargandoDisponibilidad.value = false
  }
}

onMounted(async () => {
  try {
    await chatbotStore.cargarAbogadosDisponibles()
  } catch (e) {
    // No bloquear el chat por error en catalogo.
  }
})

watch(
  () => chatbotStore.pendienteAgendar,
  (pendiente) => {
    if (pendiente) {
      pasoAgendar.value = 1
      slotSeleccionadoKey.value = ''
      errorReserva.value = ''
    }
  }
)

</script>

<template>
  <div class="container mt-4">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <h2 class="mb-4">💬 Chatbot de Ayuda - EXPERTA&ABOGADOS</h2>
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Asistente Legal Virtual</h5>
          </div>

          <!-- Chat Messages -->
          <div class="card-body bg-light" style="min-height: 400px; max-height: 500px; overflow-y: auto;">
            <template v-for="(mensaje, id) in chatbotStore.mensajes" :key="id">
              <!-- Bot Message -->
              <div class="mb-3" v-if="mensaje.role === 'bot'">
                <div class=" d-flex">
                  <div class="bg-primary text-white rounded px-3 py-2" style="max-width: 80%;">
                    <p class="mb-0 mensajeChat"><strong>Bot:</strong> {{ textoBotVisible(mensaje) }}</p>
                  </div>
                </div>
              </div>

              <!-- User Message -->
              <div class="mb-3" v-if="mensaje.role === 'user'">
                <div class="d-flex justify-content-end">
                  <div class="bg-success text-white rounded px-3 py-2" style="max-width: 80%;">
                    <p class="mb-0"><strong>Tú:</strong> {{ mensaje.content }}</p>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Input Area -->
          <div class="card-footer">
            <div v-if="chatbotStore.pendienteAgendar" class="border rounded p-3 mb-3 bg-white">
              <h6 class="mb-3">Confirmar agendamiento</h6>
              <div v-if="pasoAgendar === 1" class="row g-2">
                <div class="col-12">
                  <label class="form-label">Selecciona un abogado</label>
                  <select v-model="abogadoSeleccionado" class="form-select">
                    <option disabled value="">-- Selecciona un abogado --</option>
                    <option v-for="abogado in chatbotStore.abogadosDisponibles" :key="abogado.id" :value="abogado.id">
                      {{ abogado.nombre }} - {{ abogado.especialidad }}
                    </option>
                  </select>
                </div>
                <div class="d-flex gap-2 mt-3">
                  <button type="button" class="btn btn-primary" @click="cargarDisponibilidad"
                    :disabled="cargandoDisponibilidad || !abogadoSeleccionado">
                    {{ cargandoDisponibilidad ? 'Cargando disponibilidad...' : 'Continuar' }}
                  </button>
                  <button class="btn btn-outline-secondary" type="button" @click="cancelarAgendamiento"
                    :disabled="cargandoDisponibilidad">Cancelar</button>
                </div>
              </div>

              <div v-else class="row g-2">
                <div class="col-12">
                  <label class="form-label">Selecciona un horario disponible</label>
                </div>
                <div class="col-12" v-if="chatbotStore.disponibilidadAbogado.length > 0">
                  <div class="d-flex flex-column gap-2">
                    <label class="form-check" v-for="slot in chatbotStore.disponibilidadAbogado"
                      :key="slot.id || slot.fechaEvento">
                      <input class="form-check-input" type="radio" name="slotDisponibilidad"
                        :value="String(slot.id || slot.fechaEvento)" v-model="slotSeleccionadoKey">
                      <span class="form-check-label ms-2">
                        {{ new Date(slot.fechaEvento).toLocaleString() }}
                      </span>
                    </label>
                  </div>
                </div>
                <div class="col-12" v-else>
                  <p class="text-muted mb-0">No hay horarios disponibles para este abogado en este momento.</p>
                </div>
              </div>
              <div v-if="errorReserva" class="alert alert-danger py-2 mt-2 mb-0">{{ errorReserva }}</div>

              <div v-if="pasoAgendar === 2" class="d-flex gap-2 mt-3">
                <button class="btn btn-primary" type="button" @click="confirmarReserva" :disabled="enviandoReserva">
                  {{ enviandoReserva ? 'Confirmando...' : 'Confirmar cita' }}
                </button>
                <button class="btn btn-outline-secondary" type="button" @click="volverPasoUno"
                  :disabled="enviandoReserva">Volver</button>
                <button class="btn btn-outline-secondary" type="button" @click="cancelarAgendamiento"
                  :disabled="enviandoReserva">Cancelar</button>
              </div>
            </div>

            <div v-if="chatbotStore.ultimaCita">
              <button type="button" class="btn btn-primary w-100" @click="verMisReservas">
                Ver todas mis reservas
              </button>
            </div>

            <form v-if="!chatbotStore.pendienteAgendar && !chatbotStore.ultimaCita" class="d-flex gap-2" @submit.prevent="enviarMensaje">
              <input type="text" class="form-control" placeholder="Escribe tu pregunta aquí..." v-model="mensaje">
              <button type="submit" class="btn btn-primary">Enviar</button>
              <button type="button" class="btn btn-secondary" @click="enviarAgendarRapido">Agendar</button>
            </form>
          </div>
        </div>

        <!-- FAQ Section -->
        <div class="card mt-4">
          <div class="card-header bg-secondary text-white">
            <h5 class="mb-0">PREGUNTAS FRECUENTES</h5>
          </div>
          <div class="card-body">
            <div class="accordion" id="faqAccordion">
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                    ¿Qué tipos de servicios legales ofrecemos?
                  </button>
                </h2>
                <div id="faq1" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    Ofrecemos servicios en las siguientes áreas: defensa familiar, derecho constitucional, derecho
                    civil, leyes
                    de transito y derecho sucesorio.
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#faq2">
                    ¿Cuáles son los horarios de atención?
                  </button>
                </h2>
                <div id="faq2" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    Atendemos de lunes a viernes de 8:00 AM a 6:00 PM (Una solo jornada).
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#faq3">
                    ¿Realizan consultas virtuales?
                  </button>
                </h2>
                <div id="faq3" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    No, al usted registrar su cita debe acercarse a nuestras oficinas ubicadas en la calle Imbabura
                    entre
                    Bolivar y Fernando Valdivieso 158-14.
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#faq4">
                    ¿Tienen protección de datos y confidencialidad?
                  </button>
                </h2>
                <div id="faq4" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    Sí, cumplimos con todas las leyes de protección de datos y confidencialidad. Toda la información que
                    compartes es completamente segura.
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#faq5">
                    ¿Cuáles son los métodos de pago?
                  </button>
                </h2>
                <div id="faq5" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    Aceptamos pagos en efectivo, transferencia bancaria, tarjeta de crédito y débito.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="alert alert-info mt-4">
          <h5>📞 CONTACTOS</h5>
          <p class="mb-1"><strong>Teléfono:</strong>09924711991</p>
          <p class="mb-1"><strong>Correo:</strong> expertaabogados@gmail.com</p>
          <p class="mb-0"><strong>Dirección:</strong>Imbabura entre Bolivar y Fernando Valdivieso 158-14</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mensajeChat {
  white-space: pre-wrap;
}
</style>

