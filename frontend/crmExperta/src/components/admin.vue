<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUsuarioStore } from '../stores/usuariostore'
import { useAbogadosStore } from '../stores/abogadosStore'

const usuarioStore = useUsuarioStore()
const abogadosStore = useAbogadosStore()
const editingId = ref(null)
const form = ref({ identificacion: '', nombre: '', correo: '', especialidad: '', numLicencia: '', contrasena: '' })

const totalAbogados = computed(() => abogadosStore.abogados.length)
const especialidadesActivas = computed(() => {
  const unicas = new Set(
    abogadosStore.abogados
      .map((abogado) => (abogado.especialidad || '').trim())
      .filter(Boolean)
      .map((especialidad) => especialidad.toLowerCase())
  )
  return unicas.size
})

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
  <section class="admin-page">
    <header class="admin-header">
      <div>
        <p class="admin-eyebrow">Panel de administracion</p>
        <h1 class="admin-title">Gestion de abogados</h1>
        <p class="admin-subtitle">Administra perfiles del equipo legal y mantén la operacion actualizada.</p>
      </div>
      <button class="admin-reload-btn" @click="fetchAbogados" :disabled="abogadosStore.loading || abogadosStore.saving">
        {{ abogadosStore.loading ? 'Actualizando...' : 'Recargar datos' }}
      </button>
    </header>

    <div class="admin-summary" aria-label="Resumen operativo">
      <article class="admin-tile">
        <p class="admin-tile-label">Abogados activos</p>
        <p class="admin-tile-value">{{ totalAbogados }}</p>
      </article>
      <article class="admin-tile admin-tile--signal">
        <p class="admin-tile-label">Especialidades registradas</p>
        <p class="admin-tile-value">{{ especialidadesActivas }}</p>
      </article>
      <article class="admin-tile admin-tile--muted">
        <p class="admin-tile-label">Modo de formulario</p>
        <p class="admin-tile-value admin-tile-value--sm">{{ editingId ? 'Edicion de abogado' : 'Creacion de abogado' }}</p>
      </article>
    </div>

    <section class="admin-card">
      <header class="admin-card-header">
        <h2>{{ editingId ? 'Editar abogado' : 'Crear nuevo abogado' }}</h2>
        <p>Completa los datos del perfil profesional. La contrasena solo se solicita al crear.</p>
      </header>
      <div class="admin-card-body">
        <div v-if="abogadosStore.mensaje" class="admin-alert" role="status">{{ abogadosStore.mensaje }}</div>
        <form @submit.prevent="submitForm">
          <div class="admin-grid admin-grid--three">
            <div class="admin-field">
              <label class="admin-label">Identificacion</label>
              <input v-model="form.identificacion" class="admin-input" />
            </div>
            <div class="admin-field">
              <label class="admin-label">Nombre</label>
              <input v-model="form.nombre" class="admin-input" />
            </div>
            <div class="admin-field">
              <label class="admin-label">Correo</label>
              <input v-model="form.correo" type="email" class="admin-input" />
            </div>
          </div>

          <div class="admin-grid admin-grid--three">
            <div class="admin-field">
              <label class="admin-label">Especialidad</label>
              <input v-model="form.especialidad" class="admin-input" />
            </div>
            <div class="admin-field">
              <label class="admin-label">N. Licencia</label>
              <input v-model="form.numLicencia" class="admin-input" />
            </div>
            <div class="admin-field" v-if="!editingId">
              <label class="admin-label">Contrasena</label>
              <input v-model="form.contrasena" type="password" class="admin-input" placeholder="Solo para creacion" />
            </div>
          </div>

          <div class="admin-actions">
            <button class="admin-btn admin-btn--primary" type="submit" :disabled="abogadosStore.saving">
              {{ abogadosStore.saving ? 'Guardando...' : editingId ? 'Actualizar abogado' : 'Crear abogado' }}
            </button>
            <button class="admin-btn admin-btn--ghost" type="button" @click="resetForm" :disabled="abogadosStore.saving">
              Limpiar formulario
            </button>
          </div>
        </form>
      </div>
    </section>

    <section class="admin-card">
      <header class="admin-card-header admin-card-header--list">
        <h2>Equipo de abogados</h2>
        <p>Consulta y edita los perfiles registrados del despacho.</p>
      </header>

      <div v-if="abogadosStore.loading" class="admin-empty">
        <p class="admin-empty-title">Cargando abogados...</p>
        <p class="admin-empty-copy">Estamos actualizando la informacion de perfiles.</p>
      </div>
      <div v-else-if="abogadosStore.abogados.length === 0" class="admin-empty">
        <p class="admin-empty-title">Sin abogados registrados</p>
        <p class="admin-empty-copy">Crea el primer perfil para comenzar la asignacion de casos y citas.</p>
      </div>
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Identificacion</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Especialidad</th>
              <th>Licencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in abogadosStore.abogados" :key="a.id">
              <td>{{ a.id }}</td>
              <td>{{ a.identificacion }}</td>
              <td class="admin-strong-cell">{{ a.nombre }}</td>
              <td>{{ a.correo }}</td>
              <td>{{ a.especialidad }}</td>
              <td>{{ a.numLicencia }}</td>
              <td>
                <div class="admin-row-actions">
                  <button class="admin-btn admin-btn--ghost admin-btn--sm" @click="editAbogado(a)">Editar</button>
                  <button class="admin-btn admin-btn--danger admin-btn--sm" @click="deleteAbogado(a.id)">Eliminar</button>
                </div>
              </td>
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

.admin-grid--three {
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

.admin-input::placeholder {
  color: #9aa4b5;
}

.admin-actions {
  margin-top: 0.95rem;
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
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

.admin-btn--ghost {
  background: var(--surface);
  border-color: var(--line-dark);
  color: var(--muted);
}

.admin-btn--danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: var(--danger);
}

.admin-btn:hover:not(:disabled) {
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
  min-width: 880px;
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

.admin-table tbody tr:hover {
  background: #f8fafc;
}

.admin-strong-cell {
  font-weight: 700;
  color: var(--ink);
}

.admin-row-actions {
  display: flex;
  gap: 0.45rem;
}

.admin-btn--sm {
  padding: 0.34rem 0.58rem;
  font-size: 0.74rem;
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

.admin-input:focus-visible,
.admin-btn:focus-visible,
.admin-reload-btn:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .admin-grid--three,
  .admin-summary {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .admin-page {
    margin-top: 1rem;
    padding: 0 0.65rem;
  }

  .admin-grid--three,
  .admin-summary {
    grid-template-columns: 1fr;
  }

  .admin-actions,
  .admin-row-actions {
    flex-direction: column;
  }

  .admin-btn {
    width: 100%;
  }
}
</style>
