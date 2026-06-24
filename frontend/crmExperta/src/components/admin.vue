<script setup>
import { ref, onMounted } from 'vue'
import { useUsuarioStore } from '../stores/usuariostore'
import { useAbogadosStore } from '../stores/abogadosStore'

const usuarioStore = useUsuarioStore()
const abogadosStore = useAbogadosStore()
const editingId = ref(null)
const form = ref({ identificacion: '', nombre: '', correo: '', especialidad: '', numLicencia: '', contrasena: '' })

async function fetchAbogados() {
  await abogadosStore.fetchAbogados(usuarioStore.token)
}

function resetForm() {
  editingId.value = null
  form.value = { identificacion: '', nombre: '', correo: '', especialidad: '', numLicencia: '', contrasena: '' }
  abogadosStore.limpiarMensaje()
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
  abogadosStore.limpiarMensaje()
  if (!editingId.value && !form.value.contrasena) {
    abogadosStore.setMensaje('La contraseña es obligatoria para crear un abogado.')
    return
  }

  const payload = editingId.value
    ? {
      nombre: form.value.nombre,
      correo: form.value.correo,
      especialidad: form.value.especialidad,
      numLicencia: form.value.numLicencia
    }
    : { ...form.value }

  let ok = false
  if (editingId.value) {
    ok = await abogadosStore.actualizarAbogado(usuarioStore.token, editingId.value, payload)
  } else {
    ok = await abogadosStore.crearAbogado(usuarioStore.token, payload)
  }

  if (ok) resetForm()
}

async function deleteAbogado(id) {
  if (!confirm('¿Seguro que deseas eliminar este abogado?')) return
  await abogadosStore.eliminarAbogado(usuarioStore.token, id)
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
        <div v-if="abogadosStore.mensaje" class="alert alert-info">{{ abogadosStore.mensaje }}</div>
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
            <div class="col-md-4 mb-3" v-if="!editingId">
              <label class="form-label">Contraseña</label>
              <input v-model="form.contrasena" type="password" class="form-control" placeholder="Solo para creación" />
            </div>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-primary" type="submit" :disabled="abogadosStore.saving">
              {{ abogadosStore.saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear') }}
            </button>
            <button class="btn btn-secondary" type="button" @click="resetForm" :disabled="abogadosStore.saving">Limpiar</button>
          </div>
        </form>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5>Lista de abogados</h5>
      <button class="btn btn-sm btn-outline-primary" @click="fetchAbogados">Recargar</button>
    </div>

    <div v-if="abogadosStore.loading" class="text-center py-4">Cargando abogados...</div>
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
          <tr v-for="a in abogadosStore.abogados" :key="a.id">
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
          <tr v-if="abogadosStore.abogados.length === 0">
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
