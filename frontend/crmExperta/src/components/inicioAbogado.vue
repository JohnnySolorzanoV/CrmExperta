<script setup>
import { ref, onMounted, watch } from 'vue'
import { useUsuarioStore } from '../stores/usuariostore'

const usuarioStore = useUsuarioStore()
const abogadoId = ref(usuarioStore.usuario?.id || '')
const citas = ref([])
const casos = ref([])
const mensaje = ref('')
const loadingCitas = ref(false)
const loadingCasos = ref(false)

watch(
  () => usuarioStore.usuario,
  (usuario) => {
    if (usuario?.id) {
      abogadoId.value = usuario.id
    }
  },
  { immediate: true }
)

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (usuarioStore.token) headers.Authorization = `Bearer ${usuarioStore.token}`
  return headers
}

async function fetchDatos() {
  if (!abogadoId.value) {
    mensaje.value = 'Ingresa el ID del abogado para cargar datos.'
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
    citas.value = data.citas || []
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

async function actualizarCaso(casoId, nuevoEstado) {
  if (!usuarioStore.token) {
    mensaje.value = 'Debes iniciar sesión para actualizar un caso.'
    return
  }
  try {
    const res = await fetch(`/api/casos/${casoId}/estado`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ estado: nuevoEstado })
    })
    if (!res.ok) throw new Error('No se pudo actualizar el estado del caso')
    alert('Estado del caso actualizado')
    await fetchCasos()
  } catch (e) {
    mensaje.value = e.message
  }
}
</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-4">Inicio Abogado</h2>

    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <label class="form-label">ID del abogado</label>
            <input v-model="abogadoId" class="form-control" placeholder="Ej: 1" />
          </div>
          <div class="col-md-2">
            <button class="btn btn-primary w-100" @click="fetchDatos">Cargar datos</button>
          </div>
          <div class="col-md-6">
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
                  <div>
                    <strong>{{ c.cliente?.nombre || 'Cliente' }}</strong><br />
                    <small>{{ c.fechaHoraCopia || c.fechaHora || 'Fecha no disponible' }}</small><br />
                    <small>Estado: {{ c.estado || 'N/A' }}</small>
                  </div>
                  <button class="btn btn-sm btn-danger" @click="cancelarCita(c.id)">Cancelar</button>
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
                  <strong>{{ c.titulo || 'Caso sin título' }}</strong>
                </div>
                <div class="mb-2">
                  <small>Cliente: {{ c.cliente?.nombre || c.cliente || 'Cliente' }}</small><br />
                  <small>Estado actual: {{ c.estado || 'Pendiente' }}</small>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-secondary" @click="actualizarCaso(c.id, 'En Progreso')">En Progreso</button>
                  <button class="btn btn-sm btn-outline-primary" @click="actualizarCaso(c.id, 'Finalizado')">Finalizado</button>
                  <button class="btn btn-sm btn-outline-warning" @click="actualizarCaso(c.id, 'Pendiente')">Pendiente</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mb-4 { margin-bottom: 1.5rem; }
</style>