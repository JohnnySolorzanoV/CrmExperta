<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useChatbotStore } from '../stores/chatbotStore'
import { useChatbotConversation } from '../composables/useChatbotConversation'
import { useChatbotScheduling } from '../composables/useChatbotScheduling'
import WeeklyCalendarGrid from './WeeklyCalendarGrid.vue'

const router = useRouter()
const chatbotStore = useChatbotStore()

// ── Conversation composable ──────────────────────────────────────────────────
const {
  mensajeInput,
  mensajes,
  cargando,
  pendienteAgendar,
  ultimaCita,
  textoBotVisible,
  enviar,
  agendarRapido,
} = useChatbotConversation()

// ── Scheduling composable ────────────────────────────────────────────────────
const {
  abogadoSeleccionado,
  slotSeleccionadoKey,
  paso,
  enviando,
  cargandoDisponibilidad,
  errorReserva,
  abogados,
  calendarItems,
  cargarDisponibilidad,
  confirmarReserva,
  cancelar,
  volverPasoUno,
} = useChatbotScheduling()

onMounted(async () => {
  try {
    await chatbotStore.cargarAbogadosDisponibles()
  } catch { /* non-blocking */ }
})

function verMisReservas() {
  router.push('/mis-reservas')
}

// ── Auto-scroll ──────────────────────────────────────────────────────────────
const mensajesRef = ref(null)
const navbarHeight = ref(0)
let navbarObserver = null

function actualizarAlturaNavbar() {
  const navbar = document.querySelector('.navbar-premium')
  navbarHeight.value = navbar?.getBoundingClientRect().height ?? 0
}

async function scrollToBottom() {
  await nextTick()
  if (mensajesRef.value) {
    mensajesRef.value.scrollTop = mensajesRef.value.scrollHeight
  }
}

watch(mensajes, scrollToBottom, { deep: true })
watch(cargando, scrollToBottom)
watch(pendienteAgendar, scrollToBottom)
watch(paso, scrollToBottom)

onMounted(() => {
  actualizarAlturaNavbar()
  const navbar = document.querySelector('.navbar-premium')
  if (!navbar || typeof ResizeObserver === 'undefined') return

  navbarObserver = new ResizeObserver(() => {
    actualizarAlturaNavbar()
  })
  navbarObserver.observe(navbar)
})

onBeforeUnmount(() => {
  navbarObserver?.disconnect()
})
</script>

<template>
  <div class="chatbot-view" :style="{ '--chatbot-navbar-height': `${navbarHeight}px` }">
    <div class="chatbot-split">

      <!-- ── Left: FAQ rail ─────────────────────────────────────────── -->
      <aside class="faq-rail">
        <div class="faq-rail__header panel-header">
          <h2 class="panel-header__title">Preguntas Frecuentes</h2>
        </div>
        <div class="faq-rail__body">
          <div class="accordion accordion-flush" id="faqAccordion">
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#faq1"
                >
                  ¿Qué tipos de servicios legales ofrecemos?
                </button>
              </h2>
              <div id="faq1" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                  Ofrecemos servicios en las siguientes áreas: defensa familiar, derecho constitucional,
                  derecho civil, leyes de tránsito y derecho sucesorio.
                </div>
              </div>
            </div>

            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#faq2"
                >
                  ¿Cuáles son los horarios de atención?
                </button>
              </h2>
              <div id="faq2" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                  Atendemos de lunes a viernes de 8:00 AM a 6:00 PM.
                </div>
              </div>
            </div>

            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#faq3"
                >
                  ¿Realizan consultas virtuales?
                </button>
              </h2>
              <div id="faq3" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                  No. Al registrar su cita debe acercarse a nuestras oficinas ubicadas en la calle Imbabura
                  entre Bolívar y Fernando Valdivieso 158-14.
                </div>
              </div>
            </div>

            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#faq4"
                >
                  ¿Tienen protección de datos y confidencialidad?
                </button>
              </h2>
              <div id="faq4" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                  Sí, cumplimos con todas las leyes de protección de datos y confidencialidad.
                </div>
              </div>
            </div>

            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#faq5"
                >
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

          <!-- Contact block embedded in FAQ rail -->
          <div class="faq-contact">
            <p class="faq-contact__label">CONTACTO DIRECTO</p>
            <p class="mb-1"><strong>Teléfono:</strong> 09924711991</p>
            <p class="mb-1"><strong>Correo:</strong> expertaabogados@gmail.com</p>
            <p class="mb-0"><strong>Dirección:</strong> Imbabura entre Bolívar y Fernando Valdivieso 158-14</p>
          </div>
        </div>
      </aside>

      <!-- ── Right: Chat panel ──────────────────────────────────────── -->
      <div class="chat-panel">
        <div class="card chat-card">
          <div class="card-header panel-header">
            <h5 class="mb-0 panel-header__title">Asistente Legal Virtual</h5>
          </div>

          <!-- ── Chat messages + scheduling panel (single scroll region) ── -->
          <div class="card-body chat-messages bg-light" ref="mensajesRef">
            <template v-for="(msg, idx) in mensajes" :key="idx">
              <!-- Bot message -->
              <div class="mb-3" v-if="msg.role === 'bot'">
                <div class="d-flex">
                  <div class="chat-bubble bubble-bot">
                    <p class="mb-0 mensajeChat">{{ textoBotVisible(msg) }}</p>
                  </div>
                </div>
              </div>

              <!-- User message -->
              <div class="mb-3" v-if="msg.role === 'user'">
                <div class="d-flex justify-content-end">
                  <div class="chat-bubble bubble-user">
                    <p class="mb-0">{{ msg.content }}</p>
                  </div>
                </div>
              </div>
            </template>

            <div v-if="cargando" class="text-center text-muted small py-2">
              Escribiendo…
            </div>

            <!-- Scheduling panel — lives inside the scroll area so it never
                 overflows the fixed-height card when the calendar grid appears -->
            <div v-if="pendienteAgendar" class="border rounded p-3 mt-3 bg-white">
              <h6 class="mb-3 text-primary">Confirmar agendamiento</h6>

              <!-- Step 1 — pick lawyer -->
              <div v-if="paso === 1" class="row g-2">
                <div class="col-12">
                  <label class="form-label fw-semibold">Selecciona un abogado</label>
                  <select v-model="abogadoSeleccionado" class="form-select">
                    <option disabled value="">-- Selecciona un abogado --</option>
                    <option
                      v-for="abogado in abogados"
                      :key="abogado.id"
                      :value="abogado.id"
                    >
                      {{ abogado.nombre }} — {{ abogado.especialidad }}
                    </option>
                  </select>
                </div>
                <div class="d-flex gap-2 mt-3 justify-content-end">
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="cancelar"
                    :disabled="cargandoDisponibilidad"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    class="btn btn-primary"
                    @click="cargarDisponibilidad"
                    :disabled="cargandoDisponibilidad || !abogadoSeleccionado"
                  >
                    {{ cargandoDisponibilidad ? 'Cargando disponibilidad…' : 'Continuar' }}
                  </button>
                </div>
              </div>

              <!-- Step 2 — pick slot on weekly calendar -->
              <div v-else class="row g-2">
                <div class="col-12">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <label class="form-label fw-semibold mb-0">
                      Selecciona un horario disponible en el calendario
                    </label>
                    <span
                      v-if="calendarItems.length > 0"
                      class="badge bg-success"
                      :title="`${calendarItems.length} horarios disponibles en total`"
                    >
                      {{ calendarItems.length }} disponible{{ calendarItems.length !== 1 ? 's' : '' }}
                    </span>
                  </div>
                  <p class="text-muted small mb-2">
                    Haz clic en un bloque azul para seleccionar el horario. Usa las flechas para cambiar de semana.
                  </p>

                  <WeeklyCalendarGrid
                    :items="calendarItems"
                    mode="select"
                    v-model="slotSeleccionadoKey"
                  />
                </div>

                <div class="d-flex gap-2 mt-3 flex-wrap justify-content-between">
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="volverPasoUno"
                    :disabled="enviando"
                  >
                    Volver
                  </button>
                  <div class="d-flex gap-2">
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="cancelar"
                      :disabled="enviando"
                    >
                      Cancelar
                    </button>
                    <button
                      class="btn btn-primary"
                      type="button"
                      @click="confirmarReserva"
                      :disabled="enviando || !slotSeleccionadoKey"
                    >
                      {{ enviando ? 'Confirmando…' : 'Confirmar cita' }}
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="errorReserva" class="alert alert-danger py-2 mt-2 mb-0">
                {{ errorReserva }}
              </div>
            </div>

            <!-- Post-booking CTA — also inside scroll area -->
            <div v-if="ultimaCita" class="mt-3">
              <button type="button" class="btn btn-primary w-100" @click="verMisReservas">
                Ver todas mis reservas
              </button>
            </div>
          </div>

          <!-- ── Footer: only the message input, always compact ──── -->
          <div class="card-footer" v-if="!pendienteAgendar && !ultimaCita">
            <form class="d-flex gap-2" @submit.prevent="enviar">
              <input
                type="text"
                class="form-control"
                placeholder="Escribe tu pregunta aquí…"
                v-model="mensajeInput"
              />
              <button type="submit" class="btn btn-primary" :disabled="cargando">Enviar</button>
              <button
                type="button"
                class="btn btn-secondary"
                @click="agendarRapido"
                :disabled="cargando"
              >
                Agendar
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Preserved from original ───────────────────────────────── */
.mensajeChat {
  white-space: pre-wrap;
}

/* ── View wrapper ──────────────────────────────────────────── */
.chatbot-view {
  height: calc(100dvh - var(--chatbot-navbar-height, 0px));
  padding: 1rem 0;
  box-sizing: border-box;
  overflow: hidden;
}

/* ── Split container: full available height under navbar ─── */
.chatbot-split {
  display: flex;
  gap: 1rem;
  height: 100%;
  align-items: stretch;
  min-height: 0;
}

/* ── FAQ Rail ─────────────────────────────────────────────── */
.faq-rail {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-radius: 0.375rem;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.125);
  background: #fff;
}

.panel-header {
  background: #dab656;
  color: #000;
  padding: 0.9rem 1.25rem;
  min-height: 52px;
  display: flex;
  align-items: center;
}

.panel-header__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 400;
  line-height: 1.25;
}

.faq-rail__header {
  flex-shrink: 0;
}

.faq-rail__eyebrow {
  display: block;
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  opacity: 0.75;
  margin-bottom: 0.3rem;
}

/* Independent scroll for FAQ content */
.faq-rail__body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.faq-contact {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  color: #495057;
}

.faq-contact__label {
  display: block;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: #343a40;
  margin-bottom: 0.5rem;
}

/* ── Chat Panel ───────────────────────────────────────────── */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Bootstrap .card is already flex-column; we just anchor its height */
.chat-card {
  flex: 1;
  height: 100%;
  min-height: 0;
}

/* Message area grows to fill available space and scrolls internally */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.chat-bubble {
  max-width: 78%;
  padding: 0.55rem 0.85rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Bot — warm legal-annotation style: cream with gold left rule */
.bubble-bot {
  background: #fdf6e3;
  color: #2c2815;
  border-left: 3px solid #dab656;
  border-radius: 0 0.5rem 0.5rem 0;
}

/* User — clean slate, right-aligned */
.bubble-user {
  background: #ebebeb;
  color: #1e1e1e;
  border-radius: 0.5rem 0 0.5rem 0.5rem;
}

/* ── Mobile: stack FAQ above chat ─────────────────────────── */
@media (max-width: 767px) {
  .chatbot-split {
    flex-direction: column;
    height: 100%;
    gap: 0.75rem;
  }

  .faq-rail {
    width: 100%;
    max-height: 35%;
    min-height: 180px;
  }

  .chat-panel {
    flex: 1;
    min-height: 0;
  }
}
</style>
