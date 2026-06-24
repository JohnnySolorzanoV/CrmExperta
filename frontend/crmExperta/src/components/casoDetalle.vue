<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUsuarioStore } from '../stores/usuariostore'

const route = useRoute()
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
      fetch(`/api/casos/${casoId}`, { headers: authHeaders() }),
      fetch(`/api/documentos/caso/${casoId}`, { headers: authHeaders() })
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
    const response = await fetch(`/api/casos/${caso.value.id}/estado`, {
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
    const response = await fetch('/api/documentos', {
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
  <div class="container mt-4">
    <h2 class="mb-4">Detalle del caso</h2>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="cargando" class="text-muted">Cargando detalle del caso...</div>

    <template v-else-if="caso">
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">{{ caso.nombreCaso || 'Caso sin nombre' }}</h5>
        </div>
        <div class="card-body">
          <p class="mb-2"><strong>Tipo:</strong> {{ caso.tipoCaso || 'No definido' }}</p>
          <p class="mb-2"><strong>Estado:</strong> {{ caso.estadoCaso || 'No definido' }}</p>
          <p class="mb-2"><strong>Fecha de apertura:</strong> {{ formatearFecha(caso.fechaApertura) }}</p>
          <p class="mb-2"><strong>Cliente:</strong> {{ caso.clienteNombre || 'No disponible' }}</p>
          <p class="mb-0"><strong>Abogado:</strong> {{ caso.abogadoNombre || 'No disponible' }}</p>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0">Actualizar estado del caso</h5>
        </div>
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-6">
              <label class="form-label">Estado</label>
              <select v-model="estadoSeleccionado" class="form-select">
                <option value="abierto">abierto</option>
                <option value="en_proceso">en_proceso</option>
                <option value="cerrado">cerrado</option>
                <option value="archivado">archivado</option>
              </select>
            </div>
            <div class="col-md-6">
              <button class="btn btn-primary" @click="actualizarEstadoCaso" :disabled="actualizandoEstado">
                {{ actualizandoEstado ? 'Guardando...' : 'Guardar estado' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header bg-info text-white">
          <h5 class="mb-0">Subir documento al caso</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">Archivo</label>
            <input type="file" class="form-control" @change="onArchivoSeleccionado">
          </div>
          <div class="row g-2">
            <div class="col-md-7">
              <label class="form-label">Nombre del documento</label>
              <input v-model="formDocumento.nombreDocumento" class="form-control" placeholder="Ej: contrato.pdf" />
            </div>
            <div class="col-md-5">
              <label class="form-label">Extensión</label>
              <input v-model="formDocumento.extension" class="form-control" placeholder="pdf" />
            </div>
            <div class="col-12">
              <label class="form-label">Descripción</label>
              <input v-model="formDocumento.descripcion" class="form-control" placeholder="Descripción del documento" />
            </div>
          </div>

          <div v-if="errorDocumento" class="alert alert-danger py-2 mt-3 mb-0">{{ errorDocumento }}</div>
          <div v-if="mensajeDocumento" class="alert alert-success py-2 mt-3 mb-0">{{ mensajeDocumento }}</div>

          <button class="btn btn-primary mt-3" @click="subirDocumentoCaso" :disabled="subiendoDocumento">
            {{ subiendoDocumento ? 'Subiendo...' : 'Subir documento' }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header bg-light">
          <h5 class="mb-0">Documentos del caso</h5>
        </div>
        <div class="card-body">
          <div v-if="documentos.length === 0" class="text-muted">
            No hay documentos registrados para este caso.
          </div>
          <div v-else class="list-group">
            <div v-for="d in documentos" :key="d.id" class="list-group-item">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <strong>{{ d.nombreDocumento }}</strong><br />
                  <small>Extensión: {{ d.extension || 'N/A' }}</small><br />
                  <small>Descripción: {{ d.descripcion || 'Sin descripción' }}</small>
                </div>
                <div class="text-end">
                  <small class="text-muted d-block mb-2">{{ formatearFecha(d.fechaSubida) }}</small>
                  <a
                    v-if="d.rutaArchivo"
                    class="btn btn-sm btn-outline-primary"
                    :href="d.rutaArchivo"
                    target="_blank"
                    rel="noopener noreferrer"
                    :download="nombreDescarga(d)"
                  >
                    Descargar
                  </a>
                  <button v-else class="btn btn-sm btn-outline-secondary" disabled>Sin archivo</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
