<script setup>
import { onMounted, ref } from 'vue'
import { useUsuarioStore } from '../stores/usuariostore'
import { apiFetch } from '../utils/api'
import { formatearEnGuayaquil } from '../utils/datetime'

const usuarioStore = useUsuarioStore()
const cargando = ref(false)
const exportando = ref(false)
const error = ref('')
const registros = ref([])
const total = ref(0)
const exitos = ref(0)
const fallidos = ref(0)
const omitidos = ref(0)

function pad(n) {
  return String(n).padStart(2, '0')
}

function toLocalInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function rangoHoy() {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const fin = new Date()
  fin.setHours(23, 59, 0, 0)
  return { desde: toLocalInput(inicio), hasta: toLocalInput(fin) }
}

const hoy = rangoHoy()
const desde = ref(hoy.desde)
const hasta = ref(hoy.hasta)
const accion = ref('')
const recurso = ref('')
const resultado = ref('')

function localToIso(value, { finDeMinuto = false } = {}) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  if (finDeMinuto) d.setSeconds(59, 999)
  return d.toISOString()
}

function queryString() {
  const params = new URLSearchParams()
  const isoDesde = localToIso(desde.value)
  const isoHasta = localToIso(hasta.value, { finDeMinuto: true })
  if (isoDesde) params.set('desde', isoDesde)
  if (isoHasta) params.set('hasta', isoHasta)
  if (accion.value) params.set('accion', accion.value)
  if (recurso.value) params.set('recurso', recurso.value)
  if (resultado.value) params.set('resultado', resultado.value)
  params.set('limite', '200')
  params.set('offset', '0')
  return params.toString()
}

function authHeaders() {
  return { Authorization: 'Bearer ' + usuarioStore.token }
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const res = await apiFetch('/auditoria?' + queryString(), { headers: authHeaders() })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'No se pudo cargar la auditoria')
    registros.value = data.registros || []
    total.value = Number(data.total) || 0
    exitos.value = Number(data.conteos?.exito) || 0
    fallidos.value = Number(data.conteos?.fallido) || 0
    omitidos.value = Number(data.conteos?.omitido) || 0
  } catch (e) {
    error.value = e.message || 'Error al consultar auditoria'
    registros.value = []
    total.value = 0
    exitos.value = 0
    fallidos.value = 0
    omitidos.value = 0
  } finally {
    cargando.value = false
  }
}

async function descargarCsv() {
  exportando.value = true
  error.value = ''
  try {
    const res = await apiFetch('/auditoria/export.csv?' + queryString(), { headers: authHeaders() })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'No se pudo exportar la auditoria')
    }
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="([^"]+)"/)
    const nombre = match?.[1] || 'auditoria-sesion.csv'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message || 'Error al exportar CSV'
  } finally {
    exportando.value = false
  }
}

function formatearFecha(valor) {
  return formatearEnGuayaquil(valor, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }) || valor || '—'
}

onMounted(cargar)
</script>

<template>
  <section class="admin-page">
    <header class="admin-header">
      <div>
        <p class="admin-eyebrow">Panel de administracion</p>
        <h1 class="admin-title">Auditoria de uso</h1>
        <p class="admin-subtitle">
          Filtra por rango de fecha para aislar una sesion en vivo y descarga el CSV como evidencia.
        </p>
      </div>
      <div class="admin-header-actions">
        <button class="admin-reload-btn" type="button" @click="cargar" :disabled="cargando">
          {{ cargando ? 'Cargando...' : 'Actualizar' }}
        </button>
        <button class="admin-btn admin-btn--primary" type="button" @click="descargarCsv" :disabled="exportando || cargando">
          {{ exportando ? 'Exportando...' : 'Descargar CSV' }}
        </button>
      </div>
    </header>

    <div class="admin-summary" aria-label="Resumen del rango">
      <article class="admin-tile">
        <p class="admin-tile-label">Eventos en el rango</p>
        <p class="admin-tile-value">{{ total }}</p>
      </article>
      <article class="admin-tile admin-tile--signal">
        <p class="admin-tile-label">Exitos</p>
        <p class="admin-tile-value">{{ exitos }}</p>
      </article>
      <article class="admin-tile admin-tile--muted">
        <p class="admin-tile-label">Fallidos / omitidos</p>
        <p class="admin-tile-value admin-tile-value--sm">{{ fallidos }} / {{ omitidos }}</p>
      </article>
    </div>

    <section class="admin-card">
      <header class="admin-card-header">
        <h2>Rango de la sesion</h2>
        <p>Desde y hasta son el filtro principal. El CSV usa exactamente este rango.</p>
      </header>
      <div class="admin-card-body">
        <div v-if="error" class="admin-alert" role="alert">{{ error }}</div>
        <form class="admin-grid admin-grid--filters" @submit.prevent="cargar">
          <div class="admin-field">
            <label class="admin-label">Desde</label>
            <input v-model="desde" class="admin-input" type="datetime-local" />
          </div>
          <div class="admin-field">
            <label class="admin-label">Hasta</label>
            <input v-model="hasta" class="admin-input" type="datetime-local" />
          </div>
          <div class="admin-field">
            <label class="admin-label">Accion</label>
            <input v-model="accion" class="admin-input" placeholder="LOGIN, CREAR, CONSULTAR..." />
          </div>
          <div class="admin-field">
            <label class="admin-label">Recurso</label>
            <input v-model="recurso" class="admin-input" placeholder="Cita, Chatbot, Documento..." />
          </div>
          <div class="admin-field">
            <label class="admin-label">Resultado</label>
            <select v-model="resultado" class="admin-input">
              <option value="">Todos</option>
              <option value="exito">exito</option>
              <option value="fallido">fallido</option>
              <option value="omitido">omitido</option>
            </select>
          </div>
          <div class="admin-actions admin-actions--inline">
            <button class="admin-btn admin-btn--primary" type="submit" :disabled="cargando">Aplicar filtros</button>
          </div>
        </form>
      </div>
    </section>

    <section class="admin-card">
      <header class="admin-card-header admin-card-header--list">
        <h2>Registros</h2>
        <p>{{ total }} evento(s) coinciden con el rango. Se muestran hasta 200.</p>
      </header>
      <div v-if="cargando" class="admin-empty">
        <p class="admin-empty-title">Cargando auditoria...</p>
        <p class="admin-empty-copy">Consultando los eventos del rango seleccionado.</p>
      </div>
      <div v-else-if="registros.length === 0" class="admin-empty">
        <p class="admin-empty-title">Sin eventos en este rango</p>
        <p class="admin-empty-copy">Ajusta las fechas o ejecuta una sesion de uso para generar evidencia.</p>
      </div>
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Accion</th>
              <th>Recurso</th>
              <th>Id</th>
              <th>Detalle</th>
              <th>Resultado</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in registros" :key="fila.id">
              <td>{{ formatearFecha(fila.fecha) }}</td>
              <td class="admin-strong-cell">{{ fila.usuario_nombre || fila.usuario_id || '—' }}</td>
              <td>{{ fila.accion }}</td>
              <td>{{ fila.recurso }}</td>
              <td>{{ fila.recurso_id ?? '—' }}</td>
              <td class="admin-detalle">{{ fila.detalle || '—' }}</td>
              <td>
                <span class="admin-badge" :class="'admin-badge--' + (fila.resultado || 'muted')">
                  {{ fila.resultado }}
                </span>
              </td>
              <td>{{ fila.ip || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<style scoped>
.admin-page {
  --ink: #212529;
  --paper: #f7f8fa;
  --surface: #ffffff;
  --signal: #dab656;
  --danger: #9b1c1c;
  --muted: #6b7485;
  --line: #e2e6ed;
  --line-dark: #cfd6e0;
  --hi: #fdf3d8;
  --radius: 10px;
  max-width: 1080px;
  margin: 1.5rem auto 3rem;
  padding: 0 1rem;
  color: var(--ink);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.admin-header-actions {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.admin-eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.admin-title {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.7rem);
  font-weight: 800;
}

.admin-subtitle {
  margin: 0.4rem 0 0;
  color: var(--muted);
  max-width: 56ch;
  font-size: 0.92rem;
}

.admin-reload-btn {
  border: 1px solid var(--line-dark);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);
  padding: 0.5rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.admin-reload-btn:hover:not(:disabled) {
  border-color: var(--signal);
  color: var(--ink);
  background: var(--hi);
}

.admin-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.admin-tile {
  border: 1px solid var(--line);
  border-left: 4px solid var(--signal);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 0.85rem 1rem;
}

.admin-tile--signal {
  background: linear-gradient(180deg, rgba(253, 243, 216, 0.5), #fff);
}

.admin-tile--muted {
  border-left-color: var(--line-dark);
}

.admin-tile-label {
  margin: 0 0 0.35rem;
  color: var(--muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 700;
}

.admin-tile-value {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1.15;
}

.admin-tile-value--sm {
  font-size: 1rem;
  font-weight: 700;
}

.admin-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-card + .admin-card {
  margin-top: 1rem;
}

.admin-card-header {
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--line);
  background:
    linear-gradient(90deg, rgba(218, 182, 86, 0.16), rgba(218, 182, 86, 0)),
    rgba(33, 37, 41, 0.92);
  color: var(--bs-light, #e4e4e4);
}

.admin-card-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.admin-card-header p {
  margin: 0.28rem 0 0;
  font-size: 0.8rem;
  color: rgba(228, 228, 228, 0.86);
}

.admin-card-header--list {
  background: var(--paper);
  color: var(--ink);
}

.admin-card-header--list p {
  color: var(--muted);
}

.admin-card-body {
  padding: 1rem 1.1rem 1.2rem;
}

.admin-alert {
  margin-bottom: 0.85rem;
  padding: 0.62rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(218, 182, 86, 0.45);
  background: var(--hi);
  color: var(--ink);
  font-size: 0.82rem;
}

.admin-grid {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.admin-grid--filters {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.admin-field {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.admin-label {
  font-size: 0.74rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.admin-input {
  border: 1px solid var(--line-dark);
  border-radius: 8px;
  min-height: 40px;
  padding: 0.55rem 0.65rem;
  font-size: 0.88rem;
  color: var(--ink);
  background: var(--surface);
}

.admin-actions {
  margin-top: 0.95rem;
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.admin-actions--inline {
  margin-top: 1.45rem;
  align-items: end;
}

.admin-btn {
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.5rem 0.72rem;
  cursor: pointer;
  border: 1px solid transparent;
}

.admin-btn--primary {
  background: var(--signal);
  border-color: var(--signal);
  color: var(--ink);
}

.admin-btn:hover:not(:disabled),
.admin-reload-btn:hover:not(:disabled) {
  filter: brightness(0.97);
}

.admin-btn:disabled,
.admin-reload-btn:disabled {
  opacity: 0.56;
  cursor: default;
}

.admin-table-wrap {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.admin-table thead tr {
  background: #1f2937;
}

.admin-table th {
  color: #f8fafc;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  text-align: left;
  padding: 0.78rem 0.72rem;
}

.admin-table td {
  border-top: 1px solid var(--line);
  color: #334155;
  font-size: 0.84rem;
  padding: 0.75rem 0.72rem;
  vertical-align: middle;
}

.admin-table tbody tr:nth-child(even) {
  background: #fcfdff;
}

.admin-strong-cell {
  font-weight: 700;
  color: var(--ink);
}

.admin-detalle {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-badge {
  display: inline-block;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.admin-badge--exito {
  background: #ecfdf3;
  color: #166534;
}

.admin-badge--fallido {
  background: #fef2f2;
  color: #9b1c1c;
}

.admin-badge--omitido {
  background: #f8fafc;
  color: #64748b;
}

.admin-empty {
  text-align: center;
  padding: 2rem 1rem;
}

.admin-empty-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.admin-empty-copy {
  margin: 0.35rem 0 0;
  color: var(--muted);
  font-size: 0.82rem;
}

@media (max-width: 900px) {
  .admin-grid--filters,
  .admin-summary {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .admin-grid--filters,
  .admin-summary {
    grid-template-columns: 1fr;
  }
}
</style>
