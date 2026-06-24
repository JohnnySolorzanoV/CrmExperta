<script setup>
import { onMounted, ref } from 'vue'
import { useUsuarioStore } from '../stores/usuariostore'

const usuarioStore = useUsuarioStore()
const reservas = ref([])
const cargando = ref(false)
const error = ref('')

function formatearFecha(fechaIso) {
  if (!fechaIso) return 'Sin fecha'
  const fecha = new Date(fechaIso)
  const horaTexto = new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(fecha)
  return horaTexto
}

function formatearDia(fechaIso) {
  if (!fechaIso) return 'Sin día'
  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).format(new Date(fechaIso))
}

async function cargarReservas() {
  if (!usuarioStore.usuario?.id || !usuarioStore.token) {
    error.value = 'Debes iniciar sesión para ver tus reservas.'
    return
  }

  cargando.value = true
  error.value = ''
  try {
    const response = await fetch(`http://localhost:3000/api/citas/cliente/${usuarioStore.usuario.id}`, {
      headers: { Authorization: `Bearer ${usuarioStore.token}` }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || data?.mensaje || 'No se pudieron cargar tus reservas.')
    reservas.value = (data?.citas || []).filter(r => r.estadoCita !== 'cancelada')
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(cargarReservas)
</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-4">Mis reservas</h2>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="cargando" class="text-muted">Cargando reservas...</div>

    <div v-else class="table-responsive">
      <table class="table table-striped">
        <thead class="table-light">
          <tr>
            <th>Abogado</th>
            <th>Día</th>
            <th>Fecha</th>
            <th>Motivo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reservas" :key="r.id">
            <td>{{ r.abogadoNombre || 'No asignado' }}</td>
            <td>{{ formatearDia(r.fechaHoraCopia) }}</td>
            <td>{{ formatearFecha(r.fechaHoraCopia) }}</td>
            <td>{{ r.motivo || 'Sin motivo' }}</td>
            <td>{{ r.estadoCita || 'pendiente' }}</td>
          </tr>
          <tr v-if="reservas.length === 0">
            <td colspan="5" class="text-center">No tienes reservas registradas.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
