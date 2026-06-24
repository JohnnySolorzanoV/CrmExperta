<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUsuarioStore } from '../stores/usuariostore'

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
const formCaso = ref({
  nombreCaso: '',
  tipoCaso: '',
  estadoCaso: 'abierto'
})

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
    month: 'long'
  }).format(new Date(fechaIso))
}

function formatearHora(fechaIso) {
  if (!fechaIso) return 'Sin hora'
  return new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit'
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
    citas.value = (data.citas || []).filter(c => c.estadoCita !== 'cancelada')
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

function verCaso(casoId) {
  router.push(`/casos/${casoId}`)
}

function abrirCrearCaso(cita) {
  citaSeleccionada.value = cita
  formCaso.value = {
    nombreCaso: '',
    tipoCaso: '',
    estadoCaso: 'abierto'
  }
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
        idAbogado: abogadoId.value
      })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || data?.mensaje || 'No se pudo crear el caso.')
    }
    await fetchCasos()
    citas.value = citas.value.filter(c => c.id !== citaSeleccionada.value.id)
    cerrarCrearCaso()
  } catch (e) {
    errorCaso.value = e.message
  } finally {
    creandoCaso.value = false
  }
}
</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-4">Inicio Abogado</h2>

    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <button class="btn btn-primary w-100" @click="fetchDatos">Recargar datos</button>
          </div>
          <div class="col-md-9">
            <div v-if="mensaje" class="alert alert-warning mb-0">{{ mensaje }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card h-100">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Citas</h5>
          </div>
          <div class="card-body">
            <div v-if="loadingCitas" class="mb-3">Cargando citas...</div>
            <div v-else-if="citas.length === 0" class="text-muted">No hay citas para este abogado.</div>
            <div v-else class="list-group">
              <div v-for="c in citas" :key="c.id" class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="pe-3">
                    <strong>{{ c.clienteNombre || 'Cliente no especificado' }}</strong><br />
                    <small>Día: {{ formatearDia(c.fechaHoraCopia) }}</small><br />
                    <small>Hora: {{ formatearHora(c.fechaHoraCopia) }}</small><br />
                    <small>Estado: {{ c.estadoCita || 'pendiente' }}</small><br />
                    <small>Motivo: {{ c.motivo || 'Sin motivo registrado' }}</small><br />
                    <small>Resumen: {{ c.resumenChatbot || 'Sin resumen' }}</small>
                  </div>
                  <div class="d-flex gap-2 flex-wrap justify-content-end">
                    <button
                      v-if="c.estadoCita !== 'confirmada' && c.estadoCita !== 'cancelada' && c.estadoCita !== 'completada'"
                      class="btn btn-sm btn-outline-success"
                      @click="aceptarCita(c.id)"
                    >
                      Aceptar
                    </button>
                    <button
                      v-if="c.estadoCita === 'confirmada'"
                      class="btn btn-sm btn-primary"
                      @click="abrirCrearCaso(c)"
                    >
                      Crear caso
                    </button>
                    <button
                      class="btn btn-sm btn-danger"
                      @click="cancelarCita(c.id)"
                      :disabled="c.estadoCita === 'cancelada'"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6 mb-4">
        <div class="card h-100">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">Casos</h5>
          </div>
          <div class="card-body">
            <div v-if="loadingCasos" class="mb-3">Cargando casos...</div>
            <div v-else-if="casos.length === 0" class="text-muted">No hay casos para este abogado.</div>
            <div v-else class="list-group">
              <div v-for="c in casos" :key="c.id" class="list-group-item">
                <div class="mb-2">
                  <strong>{{ c.nombreCaso || 'Caso sin nombre' }}</strong>
                </div>
                <div class="mb-2">
                  <small>Cliente: {{ c.clienteNombre || c.cliente?.nombre || c.cliente || 'Cliente' }}</small><br />
                  <small>Estado: {{ c.estadoCaso || c.estado || 'Pendiente' }}</small>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-dark" @click="verCaso(c.id)">Ver caso</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mostrandoCrearCaso" class="modal-backdrop-custom">
      <div class="modal-card">
        <h5 class="mb-3">Crear caso desde cita</h5>
        <p class="mb-2"><strong>Cliente:</strong> {{ citaSeleccionada?.clienteNombre || 'Cliente' }}</p>
        <p class="mb-3"><strong>Cita:</strong> {{ formatearDia(citaSeleccionada?.fechaHoraCopia) }} - {{ formatearHora(citaSeleccionada?.fechaHoraCopia) }}</p>

        <div class="mb-3">
          <label class="form-label">Nombre del caso</label>
          <input v-model="formCaso.nombreCaso" class="form-control" placeholder="Ej: Proceso de alimentos" />
        </div>

        <div class="mb-3">
          <label class="form-label">Tipo de caso</label>
          <input v-model="formCaso.tipoCaso" class="form-control" placeholder="Ej: Derecho familiar" />
        </div>

        <div class="mb-3">
          <label class="form-label">Estado inicial</label>
          <select v-model="formCaso.estadoCaso" class="form-select">
            <option value="abierto">abierto</option>
            <option value="en_proceso">en_proceso</option>
            <option value="cerrado">cerrado</option>
            <option value="archivado">archivado</option>
          </select>
        </div>

        <div v-if="errorCaso" class="alert alert-danger py-2">{{ errorCaso }}</div>

        <div class="d-flex gap-2 justify-content-end">
          <button class="btn btn-outline-secondary" @click="cerrarCrearCaso" :disabled="creandoCaso">Cancelar</button>
          <button class="btn btn-primary" @click="crearCasoDesdeCita" :disabled="creandoCaso">
            {{ creandoCaso ? 'Creando...' : 'Crear caso' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mb-4 { margin-bottom: 1.5rem; }

.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-card {
  width: min(560px, 92vw);
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
</style>