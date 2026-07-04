<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUsuarioStore } from '../stores/usuariostore'
import WeeklyCalendarGrid from './WeeklyCalendarGrid.vue'
import { mapCitasToCalendarItems } from '../utils/calendarGrid'

const usuarioStore = useUsuarioStore()
const router = useRouter()

const reservas = ref([])
const casos = ref([])
const cargando = ref(false)
const cargandoCasos = ref(false)
const error = ref('')
const vistaActiva = ref('calendario')
const mostrarCitasAnteriores = ref(false)

// Cancel modal state
const mostrandoCancelar = ref(false)
const citaCancelarId = ref(null)
const motivoCancelarCliente = ref('')
const cancelandoCita = ref(false)
const errorCancelar = ref('')

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

const ESTADO_CASO_VARIANT = {
  abierto: 'ok',
  en_proceso: 'signal',
  cerrado: 'muted',
  archivado: 'muted',
}

const ESTADO_CASO_LABEL = {
  abierto: 'Abierto',
  en_proceso: 'En proceso',
  cerrado: 'Cerrado',
  archivado: 'Archivado',
}

const ORDEN_ESTADO_CASO = ['abierto', 'en_proceso', 'cerrado', 'archivado', 'sin_estado']

const calendarItems = computed(() => mapCitasToCalendarItems(reservas.value))

function formatearFecha(fechaIso) {
  if (!fechaIso) return 'Sin hora'
  return new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit' }).format(new Date(fechaIso))
}

function formatearDia(fechaIso) {
  if (!fechaIso) return 'Sin día'
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).format(new Date(fechaIso))
}

function formatearDiaCorto(fechaIso) {
  if (!fechaIso) return '–'
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit', month: 'short',
  }).format(new Date(fechaIso))
}

function esReservaPasada(fechaIso) {
  if (!fechaIso) return false
  return new Date(fechaIso).getTime() < Date.now()
}

// ── Derived summary metrics ──────────────────────────────

const proximaCita = computed(() => {
  const ahora = Date.now()
  return [...reservas.value]
    .filter(r => r.fechaHoraCopia && new Date(r.fechaHoraCopia).getTime() > ahora)
    .sort((a, b) => new Date(a.fechaHoraCopia) - new Date(b.fechaHoraCopia))[0] || null
})

const citasPendientesEstaSemana = computed(() => {
  const ahora = new Date()
  const inicio = new Date(ahora)
  inicio.setDate(ahora.getDate() - ahora.getDay())
  inicio.setHours(0, 0, 0, 0)
  const fin = new Date(inicio)
  fin.setDate(inicio.getDate() + 7)
  return reservas.value.filter(r => {
    if (!r.fechaHoraCopia) return false
    const d = new Date(r.fechaHoraCopia)
    return d >= inicio && d < fin && d > ahora
  }).length
})

const casosActivos = computed(() =>
  casos.value.filter(c => {
    const est = c.estadoCaso || c.estado || ''
    return est === 'abierto' || est === 'en_proceso'
  }).length
)

const casosAgrupadosPorEstado = computed(() => {
  const gruposMap = new Map()

  for (const caso of casos.value) {
    const estadoRaw = (caso.estadoCaso || caso.estado || '').toString().trim()
    const estadoKey = estadoRaw || 'sin_estado'
    if (!gruposMap.has(estadoKey)) gruposMap.set(estadoKey, [])
    gruposMap.get(estadoKey).push(caso)
  }

  return [...gruposMap.entries()]
    .sort((a, b) => {
      const ia = ORDEN_ESTADO_CASO.indexOf(a[0])
      const ib = ORDEN_ESTADO_CASO.indexOf(b[0])
      const ordenA = ia === -1 ? ORDEN_ESTADO_CASO.length : ia
      const ordenB = ib === -1 ? ORDEN_ESTADO_CASO.length : ib
      if (ordenA !== ordenB) return ordenA - ordenB
      return a[0].localeCompare(b[0], 'es')
    })
    .map(([estado, lista]) => ({
      estado,
      titulo: ESTADO_CASO_LABEL[estado] || (estado === 'sin_estado' ? 'Sin estado definido' : estado),
      casos: lista,
    }))
})

// Upcoming first, then past
const reservasOrdenadas = computed(() => {
  const futuras = reservas.value
    .filter(r => !esReservaPasada(r.fechaHoraCopia))
    .sort((a, b) => new Date(a.fechaHoraCopia) - new Date(b.fechaHoraCopia))
  const pasadas = reservas.value
    .filter(r => esReservaPasada(r.fechaHoraCopia))
    .sort((a, b) => new Date(b.fechaHoraCopia) - new Date(a.fechaHoraCopia))
  return [...futuras, ...pasadas]
})

const reservasVisiblesEnLista = computed(() =>
  mostrarCitasAnteriores.value
    ? reservasOrdenadas.value
    : reservasOrdenadas.value.filter(r => !esReservaPasada(r.fechaHoraCopia))
)

// ── Data fetching ────────────────────────────────────────

async function cargarReservas() {
  if (!usuarioStore.usuario?.id || !usuarioStore.token) {
    error.value = 'Debes iniciar sesión para ver tus reservas.'
    return
  }
  cargando.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/citas/cliente/${usuarioStore.usuario.id}`, {
      headers: { Authorization: `Bearer ${usuarioStore.token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || data?.mensaje || 'No se pudieron cargar tus reservas.')
    reservas.value = (data?.citas || []).filter(r => r.estadoCita !== 'cancelada')
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

function puedesCancelar(r) {
  return !esReservaPasada(r.fechaHoraCopia) && (r.estadoCita === 'pendiente' || r.estadoCita === 'confirmada')
}

function abrirCancelar(id) {
  citaCancelarId.value = id
  motivoCancelarCliente.value = ''
  errorCancelar.value = ''
  mostrandoCancelar.value = true
}

function cerrarCancelar() {
  mostrandoCancelar.value = false
  citaCancelarId.value = null
  motivoCancelarCliente.value = ''
  errorCancelar.value = ''
}

async function confirmarCancelacionCliente() {
  if (!usuarioStore.token) {
    errorCancelar.value = 'Debes iniciar sesión para cancelar una cita.'
    return
  }
  cancelandoCita.value = true
  errorCancelar.value = ''
  try {
    const res = await fetch(`/api/citas/${citaCancelarId.value}/cancelar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${usuarioStore.token}` },
      body: JSON.stringify({ motivoCancelacion: motivoCancelarCliente.value, canceladoPor: 'cliente' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || data?.mensaje || 'No se pudo cancelar la cita')
    cerrarCancelar()
    await cargarReservas()
  } catch (e) {
    errorCancelar.value = e.message
  } finally {
    cancelandoCita.value = false
  }
}

async function cargarCasos() {
  if (!usuarioStore.usuario?.id || !usuarioStore.token) return
  cargandoCasos.value = true
  try {
    const res = await fetch(`/api/casos/cliente/${usuarioStore.usuario.id}`, {
      headers: { Authorization: `Bearer ${usuarioStore.token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || data?.mensaje || 'No se pudieron cargar tus casos.')
    casos.value = data?.casos || []
  } catch {
    // Non-blocking
  } finally {
    cargandoCasos.value = false
  }
}

function verCaso(id) {
  router.push(`/mis-casos/${id}`)
}

function recargar() {
  cargarReservas()
  cargarCasos()
}

onMounted(async () => {
  await Promise.all([cargarReservas(), cargarCasos()])
})
</script>

<template>
  <div class="mr-page">

    <!-- ── Page header ──────────────────────────────────── -->
    <div class="mr-header">
      <div>
        <p class="mr-eyebrow">Panel del cliente</p>
        <h1 class="mr-title">Mis reservas y casos</h1>
      </div>
      <button
        class="mr-reload-btn"
        @click="recargar"
        :disabled="cargando || cargandoCasos"
        title="Actualizar datos"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :class="{ 'mr-spin': cargando || cargandoCasos }">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Actualizar
      </button>
    </div>

    <!-- ── Error ────────────────────────────────────────── -->
    <div v-if="error" class="mr-error-bar" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ error }}
    </div>

    <!-- ── Summary band ─────────────────────────────────── -->
    <div class="mr-summary">

      <!-- Próxima cita -->
      <div class="mr-tile mr-tile--wide">
        <p class="mr-tile-label">Próxima cita</p>
        <template v-if="cargando">
          <div class="mr-skel mr-skel--md"></div>
          <div class="mr-skel mr-skel--sm mt-1"></div>
        </template>
        <template v-else-if="proximaCita">
          <p class="mr-tile-value">{{ formatearFecha(proximaCita.fechaHoraCopia) }}</p>
          <p class="mr-tile-sub">{{ formatearDia(proximaCita.fechaHoraCopia) }}</p>
          <p class="mr-tile-meta">con {{ proximaCita.abogadoNombre || 'abogado no asignado' }}</p>
        </template>
        <p v-else class="mr-tile-empty">Sin citas próximas</p>
      </div>

      <!-- Esta semana -->
      <div class="mr-tile">
        <p class="mr-tile-label">Esta semana</p>
        <template v-if="cargando">
          <div class="mr-skel mr-skel--num"></div>
        </template>
        <template v-else>
          <p class="mr-tile-value mr-tile-value--num">{{ citasPendientesEstaSemana }}</p>
          <p class="mr-tile-sub">{{ citasPendientesEstaSemana === 1 ? 'cita pendiente' : 'citas pendientes' }}</p>
        </template>
      </div>

      <!-- Casos activos -->
      <div class="mr-tile mr-tile--ok">
        <p class="mr-tile-label">Expedientes activos</p>
        <template v-if="cargandoCasos">
          <div class="mr-skel mr-skel--num"></div>
        </template>
        <template v-else>
          <p class="mr-tile-value mr-tile-value--ok">{{ casosActivos }}</p>
          <p class="mr-tile-sub">{{ casosActivos === 1 ? 'caso en seguimiento' : 'casos en seguimiento' }}</p>
        </template>
      </div>

    </div>

    <!-- ── Tab strip ─────────────────────────────────────── -->
    <div class="mr-tabs" role="tablist">
      <button
        role="tab"
        class="mr-tab"
        :class="{ 'mr-tab--active': vistaActiva === 'calendario' }"
        :aria-selected="vistaActiva === 'calendario'"
        @click="vistaActiva = 'calendario'"
      >
        Agenda semanal
      </button>
      <button
        role="tab"
        class="mr-tab"
        :class="{ 'mr-tab--active': vistaActiva === 'lista' }"
        :aria-selected="vistaActiva === 'lista'"
        @click="vistaActiva = 'lista'"
      >
        Historial de citas
        <span v-if="reservas.length" class="mr-tab-badge">{{ reservas.length }}</span>
      </button>
      <button
        role="tab"
        class="mr-tab"
        :class="{ 'mr-tab--active': vistaActiva === 'casos' }"
        :aria-selected="vistaActiva === 'casos'"
        @click="vistaActiva = 'casos'"
      >
        Expedientes
        <span v-if="casos.length" class="mr-tab-badge" :class="{ 'mr-tab-badge--ok': casosActivos > 0 }">{{ casos.length }}</span>
      </button>
    </div>

    <!-- ── Content panel ─────────────────────────────────── -->
    <div class="mr-panel" role="tabpanel">

      <!-- ─ Calendario ─ -->
      <template v-if="vistaActiva === 'calendario'">
        <div v-if="cargando" class="mr-loading-grid">
          <div class="mr-skel mr-skel--bar" v-for="n in 5" :key="n"></div>
        </div>
        <div v-else class="mr-calendar-wrap">
        <WeeklyCalendarGrid
          :items="calendarItems"
          mode="view"
          :readonly="true"
        />
        </div>
      </template>

      <!-- ─ Lista ─ -->
      <template v-else-if="vistaActiva === 'lista'">
        <div v-if="cargando" class="mr-loading-list">
          <div class="mr-skel-row" v-for="n in 4" :key="n">
            <div class="mr-skel mr-skel--circle"></div>
            <div class="mr-skel-row-body">
              <div class="mr-skel mr-skel--md"></div>
              <div class="mr-skel mr-skel--sm mt-1"></div>
            </div>
          </div>
        </div>

        <div v-else-if="reservasVisiblesEnLista.length === 0" class="mr-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p class="mr-empty-title">{{ reservas.length ? 'No hay citas próximas visibles' : 'Sin citas registradas' }}</p>
          <p class="mr-empty-body">
            {{
              reservas.length
                ? 'Activa "Ver citas anteriores" para consultar tu historial completo.'
                : 'Aún no tienes citas en tu historial. Puedes agendar una consulta desde el chat con tu abogado.'
            }}
          </p>
        </div>

        <div v-else class="mr-cita-list">
          <div
            v-for="(r, idx) in reservasVisiblesEnLista"
            :key="r.id"
            class="mr-cita-row"
            :class="{
              'mr-cita-row--next': idx === 0 && !esReservaPasada(r.fechaHoraCopia),
              'mr-cita-row--past': esReservaPasada(r.fechaHoraCopia),
            }"
          >
            <!-- Date block -->
            <div class="mr-cita-date">
              <span class="mr-cita-date-day">{{ formatearDiaCorto(r.fechaHoraCopia) }}</span>
              <span class="mr-cita-date-time">{{ formatearFecha(r.fechaHoraCopia) }}</span>
            </div>

            <!-- Details -->
            <div class="mr-cita-details">
              <p class="mr-cita-abogado">
                {{ r.abogadoNombre || 'Abogado no asignado' }}
                <span v-if="idx === 0 && !esReservaPasada(r.fechaHoraCopia)" class="mr-next-label">Próxima</span>
              </p>
              <p class="mr-cita-motivo">{{ r.motivo || 'Sin motivo especificado' }}</p>
            </div>

            <!-- Status + cancel action -->
            <div class="mr-cita-status">
              <span class="mr-badge" :class="`mr-badge--${ESTADO_CITA_VARIANT[r.estadoCita] || 'muted'}`">
                {{ ESTADO_CITA_LABEL[r.estadoCita] || r.estadoCita || 'Pendiente' }}
              </span>
              <button
                v-if="puedesCancelar(r)"
                class="mr-cancel-btn"
                type="button"
                @click="abrirCancelar(r.id)"
                title="Cancelar esta cita"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>

        <div v-if="reservas.some(r => esReservaPasada(r.fechaHoraCopia))" class="mr-list-footer">
          <button
            class="mr-list-toggle-btn"
            type="button"
            @click="mostrarCitasAnteriores = !mostrarCitasAnteriores"
            :aria-pressed="mostrarCitasAnteriores"
          >
            {{ mostrarCitasAnteriores ? 'Ocultar citas anteriores' : 'Ver citas anteriores' }}
          </button>
        </div>
      </template>

      <!-- ─ Casos ─ -->
      <template v-else>
        <div v-if="cargandoCasos" class="mr-loading-cards">
          <div class="mr-skel-card" v-for="n in 3" :key="n">
            <div class="mr-skel mr-skel--md"></div>
            <div class="mr-skel mr-skel--sm mt-2"></div>
            <div class="mr-skel mr-skel--sm mt-1"></div>
          </div>
        </div>

        <div v-else-if="casos.length === 0" class="mr-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p class="mr-empty-title">Sin expedientes registrados</p>
          <p class="mr-empty-body">Tus expedientes aparecerán aquí una vez que se abra un caso con tu abogado.</p>
        </div>

        <div v-else class="mr-casos-sections">
          <section
            v-for="grupo in casosAgrupadosPorEstado"
            :key="grupo.estado"
            class="mr-casos-group"
          >
            <h2 class="mr-casos-group-title">{{ grupo.titulo }}</h2>
            <div class="mr-casos-grid">
              <div
                v-for="c in grupo.casos"
                :key="c.id"
                class="mr-caso-card"
                :class="`mr-caso-card--${ESTADO_CASO_VARIANT[c.estadoCaso || c.estado] || 'muted'}`"
              >
                <div class="mr-caso-docket">
                  Exp.&nbsp;<span class="mr-caso-id">{{ String(c.id).padStart(4, '0') }}</span>
                </div>
                <div class="mr-caso-header">
                  <h3 class="mr-caso-nombre">{{ c.nombreCaso || 'Caso sin nombre' }}</h3>
                  <span
                    class="mr-badge"
                    :class="`mr-badge--${ESTADO_CASO_VARIANT[c.estadoCaso || c.estado] || 'muted'}`"
                  >
                    {{ ESTADO_CASO_LABEL[c.estadoCaso || c.estado] || c.estadoCaso || c.estado || 'Pendiente' }}
                  </span>
                </div>
                <div class="mr-caso-meta">
                  <span v-if="c.abogadoNombre">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {{ c.abogadoNombre }}
                  </span>
                  <span v-if="c.tipoCaso">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    {{ c.tipoCaso }}
                  </span>
                </div>
                <button class="mr-caso-btn" @click="verCaso(c.id)">
                  Ver expediente
                </button>
              </div>
            </div>
          </section>
        </div>
      </template>

    </div>

    <!-- ── Cancel cita modal ──────────────────────────────────── -->
    <div v-if="mostrandoCancelar" class="mr-modal-backdrop" @click.self="cerrarCancelar">
      <div class="mr-modal-card">
        <p class="mr-eyebrow" style="margin:0 0 4px">Cancelar cita</p>
        <h3 class="mr-modal-title">Confirmar cancelación</h3>
        <p class="mr-modal-meta">
          Esta acción no se puede deshacer. Recibirás un correo de confirmación y el evento de tu
          Google Calendar será eliminado.
        </p>

        <div class="mr-modal-field">
          <label class="mr-modal-label">
            Motivo de cancelación
            <span style="font-weight:400;color:var(--muted)">(opcional)</span>
          </label>
          <textarea
            v-model="motivoCancelarCliente"
            class="mr-modal-textarea"
            rows="3"
            placeholder="Ej: Conflicto de horario, necesito reagendar…"
            :disabled="cancelandoCita"
          ></textarea>
        </div>

        <div v-if="errorCancelar" class="mr-modal-error">{{ errorCancelar }}</div>

        <div class="mr-modal-actions">
          <button class="mr-modal-btn mr-modal-btn--ghost" @click="cerrarCancelar" :disabled="cancelandoCita">
            Volver
          </button>
          <button class="mr-modal-btn mr-modal-btn--danger" @click="confirmarCancelacionCliente" :disabled="cancelandoCita">
            {{ cancelandoCita ? 'Cancelando…' : 'Confirmar cancelación' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ══ Design tokens ══════════════════════════════════════════ */
.mr-page {
  --ink:     #212529;
  --paper:   #F7F8FA;
  --surface: #FFFFFF;
  --signal:  #dab656;
  --ok:      #2E7D5B;
  --warn:    #c2410c;
  --danger:  #9B1C1C;
  --muted:   #6B7485;
  --line:    #E2E6ED;
  --hi:      #fdf3d8;
  --hi-ok:   #EDFBF4;
  --radius:  8px;

  padding: 1.5rem 1rem 3rem;
  max-width: 960px;
  margin: 0 auto;
  color: var(--ink);
  font-size: 0.875rem;
}

/* ══ Header ═════════════════════════════════════════════════ */
.mr-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.mr-eyebrow {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 0.25rem;
}

.mr-title {
  font-size: 1.375rem;
  font-weight: 700;
  margin: 0;
  color: var(--ink);
  line-height: 1.2;
}

.mr-reload-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.mr-reload-btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--signal);
  background: var(--hi);
}
.mr-reload-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

/* ══ Error bar ══════════════════════════════════════════════ */
.mr-error-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: var(--radius);
  color: var(--danger);
  font-size: 0.8125rem;
  margin-bottom: 1.25rem;
}

/* ══ Summary band ═══════════════════════════════════════════ */
.mr-summary {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}

.mr-tile {
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 4px solid var(--signal);
  border-radius: var(--radius);
  padding: 1rem 1.125rem;
}

.mr-tile--ok {
  border-left-color: var(--ok);
}

.mr-tile-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 0.375rem;
}

.mr-tile-value {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.125rem;
  line-height: 1.2;
}

.mr-tile-value--num {
  font-size: 1.75rem;
}

.mr-tile-value--ok {
  color: var(--ok);
}

.mr-tile-sub {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0 0 0.125rem;
  line-height: 1.4;
  text-transform: capitalize;
}

.mr-tile-meta {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
}

.mr-tile-empty {
  font-size: 0.8125rem;
  color: var(--muted);
  margin: 0.25rem 0 0;
  font-style: italic;
}

/* ══ Tab strip ══════════════════════════════════════════════ */
.mr-tabs {
  display: flex;
  gap: 0;
  background: var(--paper);
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: var(--radius) var(--radius) 0 0;
  padding: 0.375rem 0.5rem 0;
}

.mr-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted);
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.mr-tab:hover {
  color: var(--ink);
  background: var(--surface);
}

.mr-tab--active {
  color: var(--ink);
  background: var(--surface);
  border-color: var(--line);
  border-bottom-color: var(--surface);
  font-weight: 700;
  box-shadow: inset 0 -2px 0 var(--signal);
}

.mr-tab:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
  border-radius: 2px;
}

.mr-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 999px;
  background: var(--line);
  color: var(--muted);
  line-height: 1;
}

.mr-tab-badge--ok {
  background: #D1FAE5;
  color: var(--ok);
}

/* ══ Content panel ══════════════════════════════════════════ */
.mr-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-top: none;
  border-radius: 0 0 var(--radius) var(--radius);
  padding: 1.25rem;
}

/* ══ Skeleton loaders ═══════════════════════════════════════ */
@keyframes mr-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}

.mr-skel {
  background: var(--line);
  border-radius: 4px;
  animation: mr-pulse 1.4s ease-in-out infinite;
}

.mr-skel--sm  { height: 0.75rem; width: 60%; }
.mr-skel--md  { height: 1rem;    width: 80%; }
.mr-skel--num { height: 1.75rem; width: 3rem; }
.mr-skel--bar { height: 2.5rem;  width: 100%; margin-bottom: 0.5rem; }
.mr-skel--circle { width: 2.25rem; height: 2.25rem; border-radius: 50%; flex-shrink: 0; }

.mr-loading-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mr-list-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.mr-list-toggle-btn:hover {
  color: var(--ink);
  border-color: var(--muted);
  background: var(--paper);
}

.mr-list-toggle-btn:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.mr-list-footer {
  display: flex;
  justify-content: center;
  margin-top: 0.9rem;
}

.mr-skel-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--line);
}

.mr-skel-row-body {
  flex: 1;
}

.mr-loading-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.mr-skel-card {
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.mr-loading-grid {
  padding: 0.5rem 0;
}

.mr-calendar-wrap {
  margin-top: 0.25rem;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
}

/* ══ Empty states ═══════════════════════════════════════════ */
.mr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  gap: 0.5rem;
  color: var(--muted);
  text-align: center;
}

.mr-empty svg {
  color: var(--line);
  flex-shrink: 0;
}

.mr-empty-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0.5rem 0 0;
}

.mr-empty-body {
  font-size: 0.8125rem;
  color: var(--muted);
  max-width: 380px;
  margin: 0;
  line-height: 1.55;
}

/* ══ Badges ═════════════════════════════════════════════════ */
.mr-badge {
  display: inline-block;
  padding: 0.2em 0.6em;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
  line-height: 1.4;
}

.mr-badge--ok     { background: #D1FAE5; color: var(--ok); }
.mr-badge--signal { background: var(--hi); color: var(--ink); }
.mr-badge--warn   { background: #ffedd5; color: var(--warn); }
.mr-badge--danger { background: #FEE2E2; color: var(--danger); }
.mr-badge--muted  { background: var(--paper); color: var(--muted); border: 1px solid var(--line); }

/* ══ Cita list ══════════════════════════════════════════════ */
.mr-cita-list {
  display: flex;
  flex-direction: column;
}

.mr-cita-row {
  display: grid;
  grid-template-columns: 5rem 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.875rem 0.75rem;
  border-bottom: 1px solid var(--line);
  border-left: 3px solid transparent;
  border-radius: 0 4px 4px 0;
  transition: background 0.1s;
}

.mr-cita-row:last-child {
  border-bottom: none;
}

.mr-cita-row--next {
  background: var(--hi);
  border-left-color: var(--signal);
  border-radius: 4px;
}

.mr-cita-row--past {
  opacity: 0.6;
}

.mr-cita-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
  padding-right: 0.75rem;
  border-right: 1px solid var(--line);
}

.mr-cita-date-day {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink);
  text-transform: capitalize;
}

.mr-cita-date-time {
  font-size: 0.75rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.mr-cita-details {
  min-width: 0;
}

.mr-cita-abogado {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.mr-next-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink);
  background: var(--hi);
  border: 1px solid rgba(218,182,86,0.5);
  border-radius: 999px;
  padding: 0.1em 0.55em;
}

.mr-cita-motivo {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mr-cita-status {
  flex-shrink: 0;
}

/* ══ Casos grid ═════════════════════════════════════════════ */
.mr-casos-sections {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.mr-casos-group {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.mr-casos-group-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0;
}

.mr-casos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

/* Aesthetic signature: the docket line */
.mr-caso-card {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 4px solid var(--ink);
  border-radius: var(--radius);
  padding: 1rem;
  transition: box-shadow 0.15s, transform 0.15s;
}

.mr-caso-card:hover {
  box-shadow: 0 4px 16px rgba(31,42,68,0.1);
  transform: translateY(-1px);
}

.mr-caso-card--ok     { border-left-color: var(--ok); }
.mr-caso-card--signal { border-left-color: var(--signal); }
.mr-caso-card--muted  { border-left-color: var(--muted); }

.mr-caso-docket {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.625rem;
  font-family: 'Courier New', Courier, monospace;
}

.mr-caso-id {
  color: var(--ink);
}

.mr-caso-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.mr-caso-nombre {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.mr-caso-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
  margin-bottom: 1rem;
  flex: 1;
}

.mr-caso-meta span {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.mr-caso-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.4375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted);
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: calc(var(--radius) - 2px);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  margin-top: auto;
}

.mr-caso-btn:hover {
  background: var(--surface);
  color: var(--ink);
  border-color: var(--muted);
}

.mr-caso-btn:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

/* ══ Spin animation ═════════════════════════════════════════ */
@keyframes mr-spin {
  to { transform: rotate(360deg); }
}

.mr-spin {
  animation: mr-spin 0.8s linear infinite;
}

/* ══ Responsive ═════════════════════════════════════════════ */
@media (max-width: 600px) {
  .mr-summary {
    grid-template-columns: 1fr 1fr;
  }

  .mr-tile--wide {
    grid-column: 1 / -1;
  }

  .mr-cita-row {
    grid-template-columns: 4.25rem 1fr auto;
    gap: 0.5rem;
    padding: 0.75rem 0.5rem;
  }

  .mr-casos-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 400px) {
  .mr-summary {
    grid-template-columns: 1fr;
  }

  .mr-tile--wide {
    grid-column: auto;
  }
}

/* ══ Cancel button (inside cita status cell) ════════════════ */
.mr-cita-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
}

.mr-cancel-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--danger);
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.mr-cancel-btn:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.mr-cancel-btn:focus-visible {
  outline: 2px solid var(--danger);
  outline-offset: 2px;
}

/* ══ Cancel modal ═══════════════════════════════════════════ */
.mr-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.mr-modal-card {
  width: min(520px, 92vw);
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

.mr-modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.5rem;
}

.mr-modal-meta {
  font-size: 0.8125rem;
  color: var(--muted);
  line-height: 1.55;
  margin: 0 0 1rem;
}

.mr-modal-field {
  margin-bottom: 0.75rem;
}

.mr-modal-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 0.3rem;
}

.mr-modal-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  font-size: 0.85rem;
  color: var(--ink);
  background: var(--surface);
  font-family: inherit;
  resize: vertical;
}

.mr-modal-textarea:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.mr-modal-error {
  padding: 0.55rem 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: var(--danger);
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
}

.mr-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.mr-modal-btn {
  padding: 0.45rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
}

.mr-modal-btn--ghost:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--muted);
}

.mr-modal-btn--danger {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}

.mr-modal-btn--danger:hover:not(:disabled) {
  filter: brightness(0.92);
}

.mr-modal-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

/* ══ Reduced motion ═════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .mr-skel { animation: none; }
  .mr-spin  { animation: none; }
  .mr-caso-card { transition: none; }
  .mr-caso-btn  { transition: none; }
  .mr-cancel-btn { transition: none; }
}
</style>
