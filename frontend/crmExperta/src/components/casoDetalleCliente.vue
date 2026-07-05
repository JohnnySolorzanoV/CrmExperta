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

function authHeaders() {
  return { Authorization: `Bearer ${usuarioStore.token}` }
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
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
      fetch(buildApiUrl(`/documentos/caso/${casoId}`), { headers: authHeaders() }),
    ])

    const casoData = await casoRes.json()
    const docsData = await docsRes.json()

    if (!casoRes.ok) throw new Error(casoData?.error || casoData?.mensaje || 'No se pudo cargar el caso.')
    if (!docsRes.ok) throw new Error(docsData?.error || docsData?.mensaje || 'No se pudieron cargar los documentos.')

    caso.value = casoData?.caso || null
    documentos.value = docsData?.documentos || []
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(cargarCaso)
</script>

<template>
  <div class="cd-page">
    <header class="cd-header">
      <button class="cd-back-btn" @click="router.push('/mis-reservas')">
        <span aria-hidden="true">&#8592;</span>
        Volver a mis reservas
      </button>
      <div>
        <p class="cd-eyebrow">Expediente del cliente</p>
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
              <p class="cd-meta-label">Abogado asignado</p>
              <p class="cd-meta-value">{{ caso.abogadoNombre || 'No disponible' }}</p>
            </div>
          </div>
        </section>

        <section class="cd-panel">
          <div class="cd-section-head">
            <h3 class="cd-section-title">Documentos del expediente</h3>
            <span class="cd-count">{{ documentos.length }}</span>
          </div>

          <div v-if="documentos.length === 0" class="cd-empty">
            <p class="cd-empty-title">Todavía no hay documentos cargados</p>
            <p class="cd-empty-body">Cuando tu abogado agregue archivos al expediente, aparecerán aquí para consulta y descarga.</p>
          </div>

          <div v-else class="cd-doc-scroll">
            <div class="cd-doc-list">
              <article v-for="d in documentos" :key="d.id" class="cd-doc-row">
                <div class="cd-doc-main">
                  <p class="cd-doc-name">{{ d.nombreDocumento || 'Documento sin nombre' }}</p>
                  <p class="cd-doc-meta">
                    {{ d.descripcion || 'Sin descripción' }}
                  </p>
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
    </template>

    <div v-else class="cd-empty">
      <p class="cd-empty-title">No encontramos este expediente</p>
      <p class="cd-empty-body">Intenta volver a la lista de reservas y abrir el caso nuevamente.</p>
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

  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  color: var(--ink);
}

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
.cd-download-btn:focus-visible {
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

.cd-loading-panel,
.cd-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
  margin-bottom: 1rem;
}

.cd-main-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.cd-loading-panel {
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

.cd-doc-list {
  display: flex;
  flex-direction: column;
}

.cd-doc-scroll {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 0.3rem;
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

@keyframes cd-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (max-width: 720px) {
  .cd-main-content {
    grid-template-columns: 1fr;
  }

  .cd-case-grid {
    grid-template-columns: 1fr;
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
  .cd-back-btn {
    animation: none;
    transition: none;
  }
}
</style>
