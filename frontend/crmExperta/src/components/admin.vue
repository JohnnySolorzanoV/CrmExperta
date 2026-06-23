  <script setup>
import { ref, onMounted } from 'vue'
import { useUsuarioStore } from '../stores/usuariostore'

const usuarioStore = useUsuarioStore()
const abogados = ref([])
const loading = ref(false)
const mensaje = ref('')
const editingId = ref(null)
const form = ref({ identificacion: '', nombre: '', correo: '', especialidad: '', numLicencia: '', contrasena: '' })

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (usuarioStore.token) headers.Authorization = `Bearer ${usuarioStore.token}`
  return headers
}

async function fetchAbogados() {
  if (!usuarioStore.token) {
    mensaje.value = 'Inicia sesión como administrador para cargar los abogados.'
    return
  }
  loading.value = true
  mensaje.value = ''
  try {
    const res = await fetch('/api/abogados', { headers: authHeaders() })
    if (!res.ok) throw new Error('No se pudo cargar la lista de abogados')
    const data = await res.json()
    abogados.value = data.abogados || []
  } catch (e) {
    mensaje.value = e.message
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  form.value = { identificacion: '', nombre: '', correo: '', especialidad: '', numLicencia: '', contrasena: '' }
  mensaje.value = ''
}

function editAbogado(abogado) {
  editingId.value = abogado.id
  form.value = {
    identificacion: abogado.identificacion || '',
    nombre: abogado.nombre || '',
    correo: abogado.correo || '',
    especialidad: abogado.especialidad || '',
    numLicencia: abogado.numLicencia || '',
    contrasena: ''
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submitForm() {
  mensaje.value = ''
  if (!usuarioStore.token) {
    mensaje.value = 'Debes iniciar sesión como administrador para completar esta acción.'
    return
  }
  const payload = { ...form.value }
  try {
    let response
    if (editingId.value) {
      response = await fetch(`/api/abogados/${editingId.value}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('Error al actualizar el abogado')
      mensaje.value = 'Abogado actualizado correctamente.'
    } else {
      response = await fetch('/api/abogados', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('Error al crear el abogado')
      mensaje.value = 'Abogado creado correctamente.'
    }
    await fetchAbogados()
    resetForm()
  } catch (e) {
    mensaje.value = e.message
  }
}

async function deleteAbogado(id) {
  if (!confirm('¿Seguro que deseas eliminar este abogado?')) return
  mensaje.value = ''
  try {
    if (!usuarioStore.token) throw new Error('Debes iniciar sesión para eliminar un abogado.')
    const response = await fetch(`/api/abogados/${id}`, { method: 'DELETE', headers: authHeaders() })
    if (!response.ok) throw new Error('Error al eliminar el abogado')
    mensaje.value = 'Abogado eliminado correctamente.'
    await fetchAbogados()
  } catch (e) {
    mensaje.value = e.message
  }
}

onMounted(fetchAbogados)
</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-4">Administrar Abogados</h2>

    <div class="card mb-4">
      <div class="card-header bg-light">
        <strong>{{ editingId ? 'Editar abogado' : 'Crear nuevo abogado' }}</strong>
      </div>
      <div class="card-body">
        <div v-if="mensaje" class="alert alert-info">{{ mensaje }}</div>
        <form @submit.prevent="submitForm">
          <div class="row">
            <div class="col-md-4 mb-3">
              <label class="form-label">Identificación</label>
              <input v-model="form.identificacion" class="form-control" />
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">Nombre</label>
              <input v-model="form.nombre" class="form-control" />
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">Correo</label>
              <input v-model="form.correo" type="email" class="form-control" />
            </div>
          </div>

          <div class="row">
            <div class="col-md-4 mb-3">
              <label class="form-label">Especialidad</label>
              <input v-model="form.especialidad" class="form-control" />
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">N° Licencia</label>
              <input v-model="form.numLicencia" class="form-control" />
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">Contraseña</label>
              <input v-model="form.contrasena" type="password" class="form-control" placeholder="Solo para creación" />
            </div>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-primary" type="submit">{{ editingId ? 'Actualizar' : 'Crear' }}</button>
            <button class="btn btn-secondary" type="button" @click="resetForm">Limpiar</button>
          </div>
        </form>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5>Lista de abogados</h5>
      <button class="btn btn-sm btn-outline-primary" @click="fetchAbogados">Recargar</button>
    </div>

    <div v-if="loading" class="text-center py-4">Cargando abogados...</div>
    <div v-else class="table-responsive">
      <table class="table table-striped table-hover">
        <thead class="table-dark">
          <tr>
            <th>ID</th>
            <th>Identificación</th>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Especialidad</th>
            <th>N° Licencia</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in abogados" :key="a.id">
            <td>{{ a.id }}</td>
            <td>{{ a.identificacion }}</td>
            <td>{{ a.nombre }}</td>
            <td>{{ a.correo }}</td>
            <td>{{ a.especialidad }}</td>
            <td>{{ a.numLicencia }}</td>
            <td>
              <button class="btn btn-sm btn-outline-secondary me-1" @click="editAbogado(a)">Editar</button>
              <button class="btn btn-sm btn-danger" @click="deleteAbogado(a.id)">Eliminar</button>
            </td>
          </tr>
          <tr v-if="abogados.length === 0">
            <td colspan="7" class="text-center">No hay abogados registrados.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.mb-4 { margin-bottom: 1.5rem; }
</style>
