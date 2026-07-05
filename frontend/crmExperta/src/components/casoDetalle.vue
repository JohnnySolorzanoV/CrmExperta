<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsuarioStore } from '../stores/usuariostore'
import { buildApiUrl } from '../utils/api'

const route = useRoute()
const router = useRouter()
const usuarioStore = useUsuarioStore()
const caso = ref(null)
const documentos = ref([])
const cargando = ref(false)
const error = ref('')
const actualizandoEstado = ref(false)
const estadoSeleccionado = ref('abierto')
const subiendoDocumento = ref(false)
const errorDocumento = ref('')
const mensajeDocumento = ref('')
const formDocumento = ref({
  nombreDocumento: '',
  descripcion: '',
  extension: '',
  tamaño: 0
})

function authHeaders() {
  return { Authorization: `Bearer ${usuarioStore.token}` }
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(fechaIso))
}

function nombreDescarga(doc) {
  if (!doc) return 'documento'
  const base = (doc.nombreDocumento || `documento-${doc.id || 'archivo'}`).trim()
  const ext = (doc.extension || '').trim().replace(/^\./, '')
  if (!ext) return base
  return base.toLowerCase().endsWith(`.${ext.toLowerCase()}`) ? base : `${base}.${ext}`
}

async function cargarCaso() {
  if (!usuarioStore.token) {
    error.value = 'Debes iniciar sesión para ver el caso.'
    return
  }
  cargando.value = true
  error.value = ''
  try {
    const casoId = Number(route.params.id)

    const [casoRes, docsRes] = await Promise.all([
      fetch(buildApiUrl(`/casos/${casoId}`), { headers: authHeaders() }),
      fetch(buildApiUrl(`/documentos/caso/${casoId}`), { headers: authHeaders() })
    ])

    const casoData = await casoRes.json()
    const docsData = await docsRes.json()

    if (!casoRes.ok) throw new Error(casoData?.error || casoData?.mensaje || 'No se pudo cargar el caso.')
    if (!docsRes.ok) throw new Error(docsData?.error || docsData?.mensaje || 'No se pudieron cargar los documentos.')

    caso.value = casoData?.caso || null
    estadoSeleccionado.value = caso.value?.estadoCaso || 'abierto'
    documentos.value = docsData?.documentos || []
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

function onArchivoSeleccionado(event) {
  const archivo = event.target.files?.[0]
  if (!archivo) return
  const partes = archivo.name.split('.')
  const ext = partes.length > 1 ? partes.pop() : ''
  formDocumento.value.nombreDocumento = archivo.name
  formDocumento.value.extension = ext || ''
  formDocumento.value.tamaño = archivo.size || 0
}

async function actualizarEstadoCaso() {
  if (!caso.value) return
  actualizandoEstado.value = true
  error.value = ''
  try {
    const response = await fetch(buildApiUrl(`/casos/${caso.value.id}/estado`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ estado: estadoSeleccionado.value })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || data?.mensaje || 'No se pudo actualizar el estado.')
    caso.value = data?.caso || caso.value
  } catch (e) {
    error.value = e.message
  } finally {
    actualizandoEstado.value = false
  }
}

async function subirDocumentoCaso() {
  if (!caso.value) return
  mensajeDocumento.value = ''
  errorDocumento.value = ''

  if (!formDocumento.value.nombreDocumento || !formDocumento.value.extension) {
    errorDocumento.value = 'Selecciona un archivo o completa nombre y extensión.'
    return
  }

  subiendoDocumento.value = true
  try {
    const payload = {
      idCaso: caso.value.id,
      nombreDocumento: formDocumento.value.nombreDocumento,
      descripcion: formDocumento.value.descripcion,
      extension: formDocumento.value.extension,
      tamaño: formDocumento.value.tamaño
    }
    const response = await fetch(buildApiUrl('/documentos'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || data?.mensaje || 'No se pudo subir el documento.')

    mensajeDocumento.value = 'Documento subido correctamente.'
    formDocumento.value = { nombreDocumento: '', descripcion: '', extension: '', tamaño: 0 }
    await cargarCaso()
  } catch (e) {
    errorDocumento.value = e.message
  } finally {
    subiendoDocumento.value = false
  }
}

onMounted(cargarCaso)
</script>

<template>
  <div class="cd-page">
    <header class="cd-header">
      <button class="cd-back-btn" @click="router.push('/inicioAbogado')">
        <span aria-hidden="true">&#8592;</span>
        Volver a mis casos
      </button>
      <div>
        <p class="cd-eyebrow">Gestión del expediente</p>
        <h1 class="cd-title">Detalle del caso</h1>
      </div>
    </header>

    <div v-if="error" class="cd-error-bar" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ error }}
    </div>

    <div v-if="cargando" class="cd-loading-panel">
      <div class="cd-skel cd-skel--title"></div>
      <div class="cd-skel-grid">
        <div class="cd-skel cd-skel--meta"></div>
        <div class="cd-skel cd-skel--meta"></div>
        <div class="cd-skel cd-skel--meta"></div>
        <div class="cd-skel cd-skel--meta"></div>
      </div>
    </div>

    <template v-else-if="caso">
      <div class="cd-main-content">

        <section class="cd-panel">
          <div class="cd-docket-row">
            Exp.&nbsp;<span class="cd-docket-id">{{ String(caso.id || route.params.id || '').padStart(4, '0') }}</span>
          </div>
          <div class="cd-case-header">
            <h2 class="cd-case-name">{{ caso.nombreCaso || 'Caso sin nombre' }}</h2>
            <span class="cd-badge" :class="`cd-badge--${(caso.estadoCaso || '').toLowerCase()}`">
              {{ caso.estadoCaso || 'No definido' }}
            </span>
          </div>
          <div class="cd-case-grid">
            <div class="cd-meta-item">
              <p class="cd-meta-label">Tipo de caso</p>
              <p class="cd-meta-value">{{ caso.tipoCaso || 'No definido' }}</p>
            </div>
            <div class="cd-meta-item">
              <p class="cd-meta-label">Estado actual</p>
              <p class="cd-meta-value">{{ caso.estadoCaso || 'No definido' }}</p>
            </div>
            <div class="cd-meta-item">
              <p class="cd-meta-label">Fecha de apertura</p>
              <p class="cd-meta-value">{{ formatearFecha(caso.fechaApertura) }}</p>
            </div>
            <div class="cd-meta-item">
              <p class="cd-meta-label">Cliente</p>
              <p class="cd-meta-value">{{ caso.clienteNombre || 'No disponible' }}</p>
            </div>
          </div>
        </section>

        <div class="cd-actions-col">

          <section class="cd-panel">
            <div class="cd-section-head">
              <h3 class="cd-section-title">Estado del caso</h3>
            </div>
            <div class="cd-form-group">
              <label class="cd-form-label">Nuevo estado</label>
              <select v-model="estadoSeleccionado" class="cd-select">
                <option value="abierto">Abierto</option>
                <option value="en_proceso">En proceso</option>
                <option value="cerrado">Cerrado</option>
                <option value="archivado">Archivado</option>
              </select>
            </div>
            <button
              class="cd-action-btn"
              :class="{ 'cd-action-btn--busy': actualizandoEstado }"
              @click="actualizarEstadoCaso"
              :disabled="actualizandoEstado"
            >
              {{ actualizandoEstado ? 'Guardando…' : 'Guardar estado' }}
            </button>
          </section>

          <section class="cd-panel">
            <div class="cd-section-head">
              <h3 class="cd-section-title">Subir documento</h3>
            </div>
            <div class="cd-form-group">
              <label class="cd-form-label">Archivo</label>
              <input type="file" class="cd-file-input" @change="onArchivoSeleccionado" />
            </div>
            <div class="cd-form-row">
              <div class="cd-form-group cd-form-group--grow">
                <label class="cd-form-label">Nombre del documento</label>
                <input
                  v-model="formDocumento.nombreDocumento"
                  class="cd-input"
                  placeholder="Ej: contrato.pdf"
                />
              </div>
              <div class="cd-form-group cd-form-group--narrow">
                <label class="cd-form-label">Extensión</label>
                <input
                  v-model="formDocumento.extension"
                  class="cd-input"
                  placeholder="pdf"
                />
              </div>
            </div>
            <div class="cd-form-group">
              <label class="cd-form-label">Descripción</label>
              <input
                v-model="formDocumento.descripcion"
                class="cd-input"
                placeholder="Descripción del documento"
              />
            </div>

            <div v-if="errorDocumento" class="cd-error-bar cd-error-bar--inline" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ errorDocumento }}
            </div>
            <div v-if="mensajeDocumento" class="cd-success-bar" role="status">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {{ mensajeDocumento }}
            </div>

            <button
              class="cd-action-btn"
              :class="{ 'cd-action-btn--busy': subiendoDocumento }"
              @click="subirDocumentoCaso"
              :disabled="subiendoDocumento"
            >
              {{ subiendoDocumento ? 'Subiendo…' : 'Subir documento' }}
            </button>
          </section>

          <section class="cd-panel">
            <div class="cd-section-head">
              <h3 class="cd-section-title">Documentos del expediente</h3>
              <span class="cd-count">{{ documentos.length }}</span>
            </div>

            <div v-if="documentos.length === 0" class="cd-empty">
              <p class="cd-empty-title">Todavía no hay documentos cargados</p>
              <p class="cd-empty-body">Usa el formulario de arriba para agregar el primer archivo a este expediente.</p>
            </div>

            <div v-else class="cd-doc-scroll">
              <div class="cd-doc-list">
                <article v-for="d in documentos" :key="d.id" class="cd-doc-row">
                  <div class="cd-doc-main">
                    <p class="cd-doc-name">{{ d.nombreDocumento || 'Documento sin nombre' }}</p>
                    <p class="cd-doc-meta">{{ d.descripcion || 'Sin descripción' }}</p>
                    <p class="cd-doc-ext">Formato: {{ d.extension || 'N/A' }}</p>
                  </div>
                  <div class="cd-doc-actions">
                    <p class="cd-doc-date">{{ formatearFecha(d.fechaSubida) }}</p>
                    <a
                      v-if="d.rutaArchivo"
                      class="cd-download-btn"
                      :href="d.rutaArchivo"
                      target="_blank"
                      rel="noopener noreferrer"
                      :download="nombreDescarga(d)"
                    >
                      Descargar archivo
                    </a>
                    <button v-else class="cd-download-btn cd-download-btn--disabled" disabled>
                      Sin archivo disponible
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </section>

        </div>
      </div>
    </template>

    <div v-else-if="!cargando" class="cd-empty">
      <p class="cd-empty-title">No encontramos este expediente</p>
      <p class="cd-empty-body">Intenta volver al panel y abrir el caso nuevamente.</p>
    </div>
  </div>
</template>

<style scoped>
.cd-page {
  --ink: #1f2a44;
  --paper: #f7f8fa;
  --surface: #ffffff;
  --signal: #2b5db8;
  --ok: #2e7d5b;
  --warn: #92600a;
  --danger: #9b1c1c;
  --muted: #6b7485;
  --line: #e2e6ed;
  --radius: 10px;

  max-width: 1040px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  color: var(--ink);
}

/* ── Header ─────────────────────────────────── */
.cd-header {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-bottom: 1.25rem;
}

.cd-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: fit-content;
  padding: 0.3rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: calc(var(--radius) - 2px);
  cursor: pointer;
  transition: color 0.16s, border-color 0.16s;
}

.cd-back-btn:hover {
  color: var(--signal);
  border-color: var(--signal);
}

.cd-back-btn:focus-visible,
.cd-download-btn:focus-visible,
.cd-action-btn:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.cd-eyebrow {
  margin: 0 0 0.3rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.cd-title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 750;
  line-height: 1.1;
}

/* ── Feedback bars ───────────────────────────── */
.cd-error-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #fecaca;
  border-radius: var(--radius);
  background: #fef2f2;
  color: var(--danger);
  font-size: 0.8125rem;
}

.cd-error-bar--inline {
  margin-top: 0.5rem;
  margin-bottom: 0.6rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.775rem;
}

.cd-success-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.6rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #a7f3d0;
  border-radius: var(--radius);
  background: #f0fdf4;
  color: var(--ok);
  font-size: 0.775rem;
}

/* ── Loading skeleton ────────────────────────── */
.cd-loading-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
  margin-bottom: 1rem;
  animation: cd-pulse 1.2s ease-in-out infinite;
}

.cd-skel {
  border-radius: 6px;
  background: var(--line);
}

.cd-skel--title {
  width: 65%;
  height: 1.2rem;
  margin-bottom: 0.9rem;
}

.cd-skel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.cd-skel--meta {
  height: 2.6rem;
}

/* ── Main two-column layout ──────────────────── */
.cd-main-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 380px);
  gap: 1rem;
  align-items: start;
}

/* ── Panels ──────────────────────────────────── */
.cd-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
}

.cd-actions-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Case info ───────────────────────────────── */
.cd-docket-row {
  margin-bottom: 0.6rem;
  font-family: "Courier New", Courier, monospace;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.cd-docket-id {
  color: var(--ink);
}

.cd-case-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.cd-case-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.cd-badge {
  display: inline-block;
  padding: 0.2em 0.68em;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: capitalize;
  color: var(--muted);
  background: var(--paper);
  border: 1px solid var(--line);
  white-space: nowrap;
}

.cd-badge--abierto {
  color: var(--ok);
  background: #d1fae5;
  border-color: #9ee4c2;
}

.cd-badge--en_proceso,
.cd-badge--en-proceso {
  color: var(--signal);
  background: #dbeafe;
  border-color: #bfdbfe;
}

.cd-badge--cerrado,
.cd-badge--archivado {
  color: var(--muted);
  background: var(--paper);
}

.cd-case-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.cd-meta-item {
  padding: 0.68rem 0.78rem;
  border: 1px solid var(--line);
  border-left: 3px solid var(--signal);
  border-radius: calc(var(--radius) - 3px);
  background: #fbfcff;
}

.cd-meta-label {
  margin: 0 0 0.2rem;
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.cd-meta-value {
  margin: 0;
  font-size: 0.86rem;
  color: var(--ink);
}

/* ── Section head ────────────────────────────── */
.cd-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.cd-section-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
}

.cd-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--muted);
  background: var(--paper);
  border: 1px solid var(--line);
}

/* ── Form controls ───────────────────────────── */
.cd-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.65rem;
}

.cd-form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.cd-form-group--grow {
  flex: 1 1 auto;
  margin-bottom: 0;
}

.cd-form-group--narrow {
  width: 5rem;
  margin-bottom: 0;
}

.cd-form-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
}

.cd-select,
.cd-input {
  width: 100%;
  padding: 0.42rem 0.65rem;
  font-size: 0.875rem;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: calc(var(--radius) - 3px);
  transition: border-color 0.16s, box-shadow 0.16s;
  appearance: none;
}

.cd-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%236b7485' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  padding-right: 2rem;
  cursor: pointer;
}

.cd-select:focus,
.cd-input:focus {
  outline: none;
  border-color: var(--signal);
  box-shadow: 0 0 0 3px rgba(43, 93, 184, 0.12);
}

.cd-file-input {
  display: block;
  width: 100%;
  padding: 0.38rem 0.65rem;
  font-size: 0.8125rem;
  color: var(--muted);
  background: var(--paper);
  border: 1px dashed var(--line);
  border-radius: calc(var(--radius) - 3px);
  cursor: pointer;
}

.cd-file-input:focus {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

/* ── Action button ───────────────────────────── */
.cd-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.52rem 1rem;
  border-radius: calc(var(--radius) - 2px);
  border: none;
  background: var(--signal);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.16s, opacity 0.16s;
}

.cd-action-btn:hover:not(:disabled) {
  background: #1e49a0;
}

.cd-action-btn:disabled,
.cd-action-btn--busy {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Document list ───────────────────────────── */
.cd-doc-scroll {
  max-height: 54vh;
  overflow-y: auto;
  padding-right: 0.3rem;
}

.cd-doc-list {
  display: flex;
  flex-direction: column;
}

.cd-doc-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.85rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--line);
}

.cd-doc-row:last-child {
  border-bottom: none;
}

.cd-doc-name {
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
  font-weight: 700;
}

.cd-doc-meta,
.cd-doc-ext {
  margin: 0;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.45;
}

.cd-doc-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.45rem;
}

.cd-doc-date {
  margin: 0;
  font-size: 0.74rem;
  color: var(--muted);
  text-transform: capitalize;
}

.cd-download-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.32rem 0.7rem;
  border-radius: calc(var(--radius) - 3px);
  border: 1.5px solid var(--signal);
  background: transparent;
  color: var(--signal);
  font-size: 0.78rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.16s, color 0.16s;
}

.cd-download-btn:hover {
  background: var(--signal);
  color: #fff;
}

.cd-download-btn--disabled {
  border-color: var(--line);
  color: var(--muted);
  cursor: not-allowed;
}

.cd-download-btn--disabled:hover {
  background: transparent;
  color: var(--muted);
}

/* ── Empty state ─────────────────────────────── */
.cd-empty {
  padding: 1.75rem 1rem;
  border: 1px dashed var(--line);
  border-radius: calc(var(--radius) - 2px);
  text-align: center;
  color: var(--muted);
  background: #fcfdff;
}

.cd-empty-title {
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
}

.cd-empty-body {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
}

/* ── Keyframes ───────────────────────────────── */
@keyframes cd-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* ── Responsive ──────────────────────────────── */
@media (max-width: 820px) {
  .cd-main-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .cd-case-grid {
    grid-template-columns: 1fr;
  }

  .cd-form-row {
    grid-template-columns: 1fr;
  }

  .cd-form-group--narrow {
    width: 100%;
  }

  .cd-doc-scroll {
    max-height: none;
    overflow-y: visible;
    padding-right: 0;
  }

  .cd-doc-row {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }

  .cd-doc-actions {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cd-loading-panel,
  .cd-download-btn,
  .cd-back-btn,
  .cd-action-btn,
  .cd-select,
  .cd-input {
    animation: none;
    transition: none;
  }
}
</style>
