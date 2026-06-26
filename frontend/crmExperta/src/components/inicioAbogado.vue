<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUsuarioStore } from '../stores/usuariostore'
import WeeklyCalendarGrid from './WeeklyCalendarGrid.vue'
import { mapCitasToCalendarItems } from '../utils/calendarGrid'

const usuarioStore = useUsuarioStore()
const router = useRouter()
const abogadoId = ref(usuarioStore.usuario?.id || '')
const citas = ref([])
const casos = ref([])
const mensaje = ref('')
const loadingCitas = ref(false)
const loadingCasos = ref(false)
const mostrandoCrearCaso = ref(false)
const citaSeleccionada = ref(null)
const creandoCaso = ref(false)
const errorCaso = ref('')
const vistaActiva = ref('calendario') // 'calendario' | 'lista' | 'casos'

const ESTADO_CASO_LABEL = {
  abierto: 'Abierto',
  en_proceso: 'En proceso',
  cerrado: 'Cerrado',
  archivado: 'Archivado',
}

const ESTADO_CASO_VARIANT = {
  abierto: 'ok',
  en_proceso: 'signal',
  cerrado: 'muted',
  archivado: 'muted',
}

const ESTADO_CITA_LABEL = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
  reprogramada: 'Reprogramada',
}

const ESTADO_CITA_VARIANT = {
  pendiente: 'warn',
  confirmada: 'ok',
  cancelada: 'danger',
  completada: 'muted',
  reprogramada: 'muted',
}

const formCaso = ref({
  nombreCaso: '',
  tipoCaso: '',
  estadoCaso: 'abierto',
})

// Maps the citas list into normalised items for the calendar grid
const calendarItems = computed(() => mapCitasToCalendarItems(citas.value))

const citasOrdenadas = computed(() =>
  [...citas.value].sort((a, b) => new Date(a.fechaHoraCopia) - new Date(b.fechaHoraCopia))
)

const proximaCita = computed(() => {
  const ahora = Date.now()
  return citasOrdenadas.value.find((cita) => new Date(cita.fechaHoraCopia).getTime() > ahora) || null
})

const citasPendientesConfirmacion = computed(
  () => citas.value.filter((c) => c.estadoCita === 'pendiente').length
)

const casosActivos = computed(
  () => casos.value.filter((c) => ['abierto', 'en_proceso'].includes(c.estadoCaso || c.estado)).length
)

watch(
  () => usuarioStore.usuario,
  async (usuario) => {
    if (usuario?.id) {
      abogadoId.value = usuario.id
      await fetchDatos()
    }
  },
  { immediate: true }
)

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (usuarioStore.token) headers.Authorization = `Bearer ${usuarioStore.token}`
  return headers
}

function formatearDia(fechaIso) {
  if (!fechaIso) return 'Sin día'
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(fechaIso))
}

function formatearHora(fechaIso) {
  if (!fechaIso) return 'Sin hora'
  return new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fechaIso))
}

async function fetchDatos() {
  if (!abogadoId.value) {
    mensaje.value = 'No se pudo identificar el abogado autenticado.'
    return
  }
  mensaje.value = ''
  await Promise.all([fetchCitas(), fetchCasos()])
}

async function fetchCitas() {
  if (!usuarioStore.token) {
    mensaje.value = 'Inicia sesión para cargar tus citas.'
    return
  }
  loadingCitas.value = true
  try {
    const res = await fetch(`/api/citas/abogado/${abogadoId.value}`, { headers: authHeaders() })
    if (!res.ok) throw new Error('No se pudieron cargar las citas')
    const data = await res.json()
    citas.value = (data.citas || []).filter((c) => c.estadoCita !== 'cancelada')
  } catch (e) {
    mensaje.value = e.message
  } finally {
    loadingCitas.value = false
  }
}

async function fetchCasos() {
  if (!usuarioStore.token) {
    mensaje.value = 'Inicia sesión para cargar tus casos.'
    return
  }
  loadingCasos.value = true
  try {
    const res = await fetch(`/api/casos/abogado/${abogadoId.value}`, { headers: authHeaders() })
    if (!res.ok) throw new Error('No se pudieron cargar los casos')
    const data = await res.json()
    casos.value = data.casos || []
  } catch (e) {
    mensaje.value = e.message
  } finally {
    loadingCasos.value = false
  }
}

async function cancelarCita(id) {
  if (!confirm('¿Cancelar esta cita?')) return
  if (!usuarioStore.token) {
    mensaje.value = 'Debes iniciar sesión para cancelar una cita.'
    return
  }
  try {
    const res = await fetch(`/api/citas/${id}/cancelar`, { method: 'PUT', headers: authHeaders() })
    if (!res.ok) throw new Error('No se pudo cancelar la cita')
    alert('Cita cancelada')
    await fetchCitas()
  } catch (e) {
    mensaje.value = e.message
  }
}

async function aceptarCita(id) {
  if (!confirm('¿Aceptar esta cita?')) return
  if (!usuarioStore.token) {
    mensaje.value = 'Debes iniciar sesión para aceptar una cita.'
    return
  }
  try {
    const res = await fetch(`/api/citas/${id}/aceptar`, { method: 'PUT', headers: authHeaders() })
    if (!res.ok) throw new Error('No se pudo aceptar la cita')
    await fetchCitas()
  } catch (e) {
    mensaje.value = e.message
  }
}

/** Handles action buttons emitted from WeeklyCalendarGrid in view mode. */
async function onCalendarAction(action, rawCita) {
  if (action === 'aceptar') {
    await aceptarCita(rawCita.id)
  } else if (action === 'cancelar') {
    await cancelarCita(rawCita.id)
  } else if (action === 'crear-caso') {
    abrirCrearCaso(rawCita)
  }
}

function verCaso(casoId) {
  router.push(`/casos/${casoId}`)
}

function abrirCrearCaso(cita) {
  citaSeleccionada.value = cita
  formCaso.value = { nombreCaso: '', tipoCaso: '', estadoCaso: 'abierto' }
  errorCaso.value = ''
  mostrandoCrearCaso.value = true
}

function cerrarCrearCaso() {
  mostrandoCrearCaso.value = false
  citaSeleccionada.value = null
  errorCaso.value = ''
}

async function crearCasoDesdeCita() {
  if (!citaSeleccionada.value) return
  if (!formCaso.value.nombreCaso || !formCaso.value.tipoCaso) {
    errorCaso.value = 'Completa nombre y tipo de caso.'
    return
  }
  if (!usuarioStore.token) {
    errorCaso.value = 'Debes iniciar sesión para crear un caso.'
    return
  }
  creandoCaso.value = true
  errorCaso.value = ''
  try {
    const response = await fetch('/api/casos', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        nombreCaso: formCaso.value.nombreCaso,
        tipoCaso: formCaso.value.tipoCaso,
        estadoCaso: formCaso.value.estadoCaso,
        idCliente: citaSeleccionada.value.idCliente,
        idAbogado: abogadoId.value,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || data?.mensaje || 'No se pudo crear el caso.')
    }
    await fetchCasos()
    citas.value = citas.value.filter((c) => c.id !== citaSeleccionada.value.id)
    cerrarCrearCaso()
  } catch (e) {
    errorCaso.value = e.message
  } finally {
    creandoCaso.value = false
  }
}
</script>

<template>
  <div class="ia-page">
    <div class="ia-header">
      <div>
        <p class="ia-eyebrow">Panel del abogado</p>
        <h1 class="ia-title">Inicio y gestión de citas</h1>
      </div>
      <button class="ia-reload-btn" @click="fetchDatos" :disabled="loadingCitas || loadingCasos">
        Recargar
      </button>
    </div>

    <div v-if="mensaje" class="ia-error-bar" role="alert">
      {{ mensaje }}
    </div>

    <div class="ia-summary">
      <div class="ia-tile ia-tile--wide">
        <p class="ia-tile-label">Próxima cita</p>
        <template v-if="loadingCitas">
          <div class="ia-skel ia-skel--md"></div>
          <div class="ia-skel ia-skel--sm mt-1"></div>
        </template>
        <template v-else-if="proximaCita">
          <p class="ia-tile-value">{{ formatearHora(proximaCita.fechaHoraCopia) }}</p>
          <p class="ia-tile-sub">{{ formatearDia(proximaCita.fechaHoraCopia) }}</p>
          <p class="ia-tile-meta">Cliente: {{ proximaCita.clienteNombre || 'No especificado' }}</p>
        </template>
        <p v-else class="ia-tile-empty">No hay citas próximas registradas.</p>
      </div>

      <div class="ia-tile ia-tile--warn">
        <p class="ia-tile-label">Por confirmar</p>
        <template v-if="loadingCitas">
          <div class="ia-skel ia-skel--num"></div>
        </template>
        <template v-else>
          <p class="ia-tile-value ia-tile-value--num">{{ citasPendientesConfirmacion }}</p>
          <p class="ia-tile-sub">
            {{ citasPendientesConfirmacion === 1 ? 'cita pendiente' : 'citas pendientes' }}
          </p>
        </template>
      </div>

      <div class="ia-tile ia-tile--ok">
        <p class="ia-tile-label">Casos activos</p>
        <template v-if="loadingCasos">
          <div class="ia-skel ia-skel--num"></div>
        </template>
        <template v-else>
          <p class="ia-tile-value ia-tile-value--ok ia-tile-value--num">{{ casosActivos }}</p>
          <p class="ia-tile-sub">{{ casosActivos === 1 ? 'expediente en curso' : 'expedientes en curso' }}</p>
        </template>
      </div>
    </div>

    <div class="ia-tabs" role="tablist">
      <button
        role="tab"
        class="ia-tab"
        :class="{ 'ia-tab--active': vistaActiva === 'calendario' }"
        :aria-selected="vistaActiva === 'calendario'"
        @click="vistaActiva = 'calendario'"
      >
        Agenda semanal
      </button>
      <button
        role="tab"
        class="ia-tab"
        :class="{ 'ia-tab--active': vistaActiva === 'lista' }"
        :aria-selected="vistaActiva === 'lista'"
        @click="vistaActiva = 'lista'"
      >
        Citas
        <span v-if="citas.length" class="ia-tab-badge">{{ citas.length }}</span>
      </button>
      <button
        role="tab"
        class="ia-tab"
        :class="{ 'ia-tab--active': vistaActiva === 'casos' }"
        :aria-selected="vistaActiva === 'casos'"
        @click="vistaActiva = 'casos'"
      >
        Casos
        <span v-if="casos.length" class="ia-tab-badge ia-tab-badge--ok">{{ casos.length }}</span>
      </button>
    </div>

    <div class="ia-panel">
      <template v-if="vistaActiva === 'calendario'">
        <div v-if="loadingCitas" class="ia-loading-grid">
          <div v-for="n in 5" :key="n" class="ia-skel ia-skel--bar"></div>
        </div>
        <div v-else class="ia-calendar-wrap">
          <WeeklyCalendarGrid :items="calendarItems" mode="view" @cita-action="onCalendarAction" />
        </div>
      </template>

      <template v-else-if="vistaActiva === 'lista'">
        <div v-if="loadingCitas" class="ia-loading-list">
          <div v-for="n in 4" :key="n" class="ia-skel-row">
            <div class="ia-skel ia-skel--md"></div>
            <div class="ia-skel ia-skel--sm"></div>
          </div>
        </div>
        <div v-else-if="citasOrdenadas.length === 0" class="ia-empty">
          <p class="ia-empty-title">Sin citas registradas</p>
          <p class="ia-empty-body">Las solicitudes de tus clientes apareceran aqui para gestionarlas.</p>
        </div>
        <div v-else class="ia-cita-list">
          <div
            v-for="c in citasOrdenadas"
            :key="c.id"
            class="ia-cita-row"
            :class="{ 'ia-cita-row--priority': c.estadoCita === 'pendiente' }"
          >
            <div class="ia-cita-date">
              <span class="ia-cita-day">{{ formatearDia(c.fechaHoraCopia) }}</span>
              <span class="ia-cita-time">{{ formatearHora(c.fechaHoraCopia) }}</span>
            </div>
            <div class="ia-cita-details">
              <p class="ia-cita-cliente">
                {{ c.clienteNombre || 'Cliente no especificado' }}
                <span v-if="c.estadoCita === 'pendiente'" class="ia-next-label">Atencion</span>
              </p>
              <p class="ia-cita-motivo">{{ c.motivo || 'Sin motivo registrado' }}</p>
              <p class="ia-cita-resumen">{{ c.resumenChatbot || 'Sin resumen de chatbot.' }}</p>
            </div>
            <div class="ia-cita-aside">
              <span class="ia-badge" :class="`ia-badge--${ESTADO_CITA_VARIANT[c.estadoCita] || 'muted'}`">
                {{ ESTADO_CITA_LABEL[c.estadoCita] || c.estadoCita || 'Pendiente' }}
              </span>
              <div class="ia-actions">
                <button
                  v-if="c.estadoCita !== 'confirmada' && c.estadoCita !== 'cancelada' && c.estadoCita !== 'completada'"
                  class="ia-btn ia-btn--ghost"
                  @click="aceptarCita(c.id)"
                >
                  Aceptar
                </button>
                <button
                  v-if="c.estadoCita === 'confirmada'"
                  class="ia-btn ia-btn--primary"
                  @click="abrirCrearCaso(c)"
                >
                  Crear caso
                </button>
                <button
                  class="ia-btn ia-btn--danger"
                  @click="cancelarCita(c.id)"
                  :disabled="c.estadoCita === 'cancelada'"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="loadingCasos" class="ia-loading-cards">
          <div class="ia-skel-card" v-for="n in 3" :key="n">
            <div class="ia-skel ia-skel--md"></div>
            <div class="ia-skel ia-skel--sm mt-1"></div>
          </div>
        </div>
        <div v-else-if="casos.length === 0" class="ia-empty">
          <p class="ia-empty-title">Sin casos asociados</p>
          <p class="ia-empty-body">Cuando confirmes citas y abras expedientes, apareceran en esta seccion.</p>
        </div>
        <div v-else class="ia-casos-grid">
          <article
            v-for="c in casos"
            :key="c.id"
            class="ia-caso-card"
            :class="`ia-caso-card--${ESTADO_CASO_VARIANT[c.estadoCaso || c.estado] || 'muted'}`"
          >
            <p class="ia-caso-docket">Exp. {{ String(c.id).padStart(4, '0') }}</p>
            <div class="ia-caso-header">
              <h2 class="ia-caso-nombre">{{ c.nombreCaso || 'Caso sin nombre' }}</h2>
              <span class="ia-badge" :class="`ia-badge--${ESTADO_CASO_VARIANT[c.estadoCaso || c.estado] || 'muted'}`">
                {{ ESTADO_CASO_LABEL[c.estadoCaso || c.estado] || c.estadoCaso || c.estado || 'Pendiente' }}
              </span>
            </div>
            <div class="ia-caso-meta">
              <span>Cliente: {{ c.clienteNombre || c.cliente?.nombre || c.cliente || 'Cliente sin nombre' }}</span>
              <span v-if="c.tipoCaso">Tipo: {{ c.tipoCaso }}</span>
            </div>
            <button class="ia-btn ia-btn--ghost ia-btn--full" @click="verCaso(c.id)">Ver caso</button>
          </article>
        </div>
      </template>
    </div>

    <div v-if="mostrandoCrearCaso" class="ia-modal-backdrop">
      <div class="ia-modal-card">
        <p class="ia-eyebrow">Crear expediente</p>
        <h3 class="ia-modal-title">Nuevo caso desde cita confirmada</h3>
        <p class="ia-modal-meta">
          <strong>Cliente:</strong> {{ citaSeleccionada?.clienteNombre || 'Cliente' }}<br />
          <strong>Cita:</strong> {{ formatearDia(citaSeleccionada?.fechaHoraCopia) }} - {{ formatearHora(citaSeleccionada?.fechaHoraCopia) }}
        </p>

        <div class="ia-field">
          <label class="ia-label">Nombre del caso</label>
          <input
            v-model="formCaso.nombreCaso"
            class="ia-input"
            placeholder="Ej: Proceso de alimentos"
          />
        </div>

        <div class="ia-field">
          <label class="ia-label">Tipo de caso</label>
          <input
            v-model="formCaso.tipoCaso"
            class="ia-input"
            placeholder="Ej: Derecho familiar"
          />
        </div>

        <div class="ia-field">
          <label class="ia-label">Estado inicial</label>
          <select v-model="formCaso.estadoCaso" class="ia-select">
            <option value="abierto">abierto</option>
            <option value="en_proceso">en_proceso</option>
            <option value="cerrado">cerrado</option>
            <option value="archivado">archivado</option>
          </select>
        </div>

        <div v-if="errorCaso" class="ia-error-bar ia-error-bar--soft">{{ errorCaso }}</div>

        <div class="ia-modal-actions">
          <button class="ia-btn ia-btn--ghost" @click="cerrarCrearCaso" :disabled="creandoCaso">
            Cancelar
          </button>
          <button class="ia-btn ia-btn--primary" @click="crearCasoDesdeCita" :disabled="creandoCaso">
            {{ creandoCaso ? 'Creando...' : 'Crear caso' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ia-page {
  --ink: #212529;
  --paper: #f7f8fa;
  --surface: #ffffff;
  --signal: #dab656;
  --ok: #2e7d5b;
  --warn: #c2410c;
  --danger: #9b1c1c;
  --muted: #6b7485;
  --line: #e2e6ed;
  --hi: #fdf3d8;
  --radius: 8px;

  max-width: 1024px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  color: var(--ink);
}

.ia-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.ia-eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.ia-title {
  margin: 0;
  font-size: 1.375rem;
  line-height: 1.2;
  font-weight: 700;
}

.ia-reload-btn {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--muted);
  padding: 0.4rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.ia-reload-btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--signal);
  background: var(--hi);
}

.ia-reload-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.ia-error-bar {
  margin-bottom: 1rem;
  padding: 0.65rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: var(--danger);
  font-size: 0.8125rem;
}

.ia-error-bar--soft {
  margin-top: 0.75rem;
  margin-bottom: 0;
}

.ia-summary {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.ia-tile {
  border: 1px solid var(--line);
  border-left: 4px solid var(--signal);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 0.95rem 1.05rem;
}

.ia-tile--ok {
  border-left-color: var(--ok);
}

.ia-tile--warn {
  border-left-color: var(--warn);
}

.ia-tile-label {
  margin: 0 0 0.3rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.ia-tile-value {
  margin: 0;
  line-height: 1.2;
  font-size: 1.25rem;
  font-weight: 700;
}

.ia-tile-value--num {
  font-size: 1.75rem;
}

.ia-tile-value--ok {
  color: var(--ok);
}

.ia-tile-sub,
.ia-tile-meta,
.ia-tile-empty {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  color: var(--muted);
}

.ia-tabs {
  display: flex;
  gap: 0;
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: var(--radius) var(--radius) 0 0;
  background: var(--paper);
  padding: 0.35rem 0.5rem 0;
}

.ia-tab {
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  margin-bottom: -1px;
  background: transparent;
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.ia-tab:hover {
  color: var(--ink);
  background: var(--surface);
}

.ia-tab--active {
  color: var(--ink);
  font-weight: 700;
  background: var(--surface);
  border-color: var(--line);
  border-bottom-color: var(--surface);
  box-shadow: inset 0 -2px 0 var(--signal);
}

.ia-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  padding: 0 0.35rem;
  font-size: 0.625rem;
  font-weight: 700;
  background: var(--line);
  color: var(--muted);
}

.ia-tab-badge--ok {
  color: var(--ok);
  background: #d1fae5;
}

.ia-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-top: none;
  border-radius: 0 0 var(--radius) var(--radius);
  padding: 1.15rem;
}

.ia-calendar-wrap {
  margin-top: 0.2rem;
}

.ia-cita-list {
  display: flex;
  flex-direction: column;
}

.ia-cita-row {
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 0.8rem;
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid var(--line);
  border-left: 3px solid transparent;
}

.ia-cita-row:last-child {
  border-bottom: none;
}

.ia-cita-row--priority {
  background: var(--hi);
  border-left-color: var(--warn);
  border-radius: 4px;
}

.ia-cita-date {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid var(--line);
  padding-right: 0.75rem;
}

.ia-cita-day {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: capitalize;
}

.ia-cita-time {
  font-size: 0.78rem;
  color: var(--muted);
}

.ia-cita-cliente {
  margin: 0 0 0.2rem;
  font-size: 0.875rem;
  font-weight: 700;
  display: flex;
  gap: 0.45rem;
  align-items: center;
  flex-wrap: wrap;
}

.ia-next-label {
  border: 1px solid rgba(194, 65, 12, 0.25);
  background: #ffedd5;
  color: var(--warn);
  border-radius: 999px;
  font-size: 0.625rem;
  padding: 0.1rem 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.ia-cita-motivo,
.ia-cita-resumen {
  margin: 0;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.45;
}

.ia-cita-aside {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 0.45rem;
}

.ia-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ia-btn {
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
}

.ia-btn--full {
  width: 100%;
}

.ia-btn--ghost:hover:not(:disabled) {
  border-color: var(--muted);
  color: var(--ink);
}

.ia-btn--primary {
  background: var(--signal);
  border-color: var(--signal);
  color: var(--ink);
}

.ia-btn--primary:hover:not(:disabled) {
  filter: brightness(0.96);
}

.ia-btn--danger {
  background: #fef2f2;
  color: var(--danger);
  border-color: #fecaca;
}

.ia-btn--danger:hover:not(:disabled) {
  background: #fee2e2;
}

.ia-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.ia-badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.6875rem;
  font-weight: 700;
}

.ia-badge--ok {
  background: #d1fae5;
  color: var(--ok);
}

.ia-badge--signal {
  background: var(--hi);
  color: var(--ink);
}

.ia-badge--warn {
  background: #ffedd5;
  color: var(--warn);
}

.ia-badge--danger {
  background: #fee2e2;
  color: var(--danger);
}

.ia-badge--muted {
  background: var(--paper);
  color: var(--muted);
  border: 1px solid var(--line);
}

.ia-casos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.ia-caso-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid var(--line);
  border-left: 4px solid var(--ink);
  border-radius: var(--radius);
  padding: 1rem;
  background: var(--surface);
}

.ia-caso-card--ok {
  border-left-color: var(--ok);
}

.ia-caso-card--signal {
  border-left-color: var(--signal);
}

.ia-caso-card--muted {
  border-left-color: var(--muted);
}

.ia-caso-docket {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: "Courier New", Courier, monospace;
}

.ia-caso-header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.ia-caso-nombre {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.3;
}

.ia-caso-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
  margin-bottom: 0.2rem;
  flex: 1;
}

.ia-empty {
  text-align: center;
  padding: 2.5rem 1rem;
}

.ia-empty-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.ia-empty-body {
  margin: 0.35rem auto 0;
  max-width: 420px;
  color: var(--muted);
  font-size: 0.8125rem;
}

.ia-loading-grid,
.ia-loading-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ia-loading-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.9rem;
}

.ia-skel-row,
.ia-skel-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.75rem;
}

@keyframes ia-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.ia-skel {
  border-radius: 4px;
  background: var(--line);
  animation: ia-pulse 1.4s ease-in-out infinite;
}

.ia-skel--sm {
  width: 58%;
  height: 0.7rem;
}

.ia-skel--md {
  width: 82%;
  height: 1rem;
}

.ia-skel--num {
  width: 3rem;
  height: 1.8rem;
}

.ia-skel--bar {
  width: 100%;
  height: 2.5rem;
}

.ia-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.ia-modal-card {
  width: min(560px, 92vw);
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1.15rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.ia-modal-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
}

.ia-modal-meta {
  margin: 0 0 0.85rem;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.ia-field {
  margin-bottom: 0.65rem;
}

.ia-label {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
}

.ia-input,
.ia-select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  font-size: 0.85rem;
  color: var(--ink);
  background: var(--surface);
}

.ia-input:focus-visible,
.ia-select:focus-visible,
.ia-tab:focus-visible,
.ia-btn:focus-visible,
.ia-reload-btn:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.ia-modal-actions {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 880px) {
  .ia-summary {
    grid-template-columns: 1fr 1fr;
  }
  .ia-tile--wide {
    grid-column: 1 / -1;
  }
  .ia-cita-row {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }
  .ia-cita-date {
    border-right: none;
    border-bottom: 1px solid var(--line);
    padding-right: 0;
    padding-bottom: 0.45rem;
  }
  .ia-cita-aside {
    align-items: flex-start;
  }
  .ia-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 520px) {
  .ia-summary {
    grid-template-columns: 1fr;
  }
  .ia-tile--wide {
    grid-column: auto;
  }
  .ia-tabs {
    overflow-x: auto;
  }
  .ia-casos-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ia-skel {
    animation: none;
  }
}
</style>
