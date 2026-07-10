<script setup>
import { ref } from 'vue'
import { useUsuarioStore } from '../stores/usuariostore'

const usuarioStore = useUsuarioStore()
const correo = ref('')
const cargando = ref(false)
const error = ref('')
const mensaje = ref('')

async function enviarInstrucciones() {
  if (!correo.value) return

  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const respuesta = await usuarioStore.solicitarRecuperacionContrasena(correo.value.trim())
    mensaje.value = respuesta?.mensaje || 'Si el correo existe, te enviaremos instrucciones para recuperar la contraseña.'
  } catch (err) {
    error.value = err?.message || 'No fue posible procesar la solicitud.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="container mt-5 text-center">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card p-5">
          <h2 class="mb-4">Recuperar Contraseña</h2>
          <p class="text-muted mb-4">Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu contraseña.</p>
          <form @submit.prevent="enviarInstrucciones">
            <div class="mb-3">
              <label for="email" class="form-label">Correo Electrónico</label>
              <input
                id="email"
                v-model="correo"
                type="email"
                class="form-control"
                placeholder="tu@correo.com"
                autocomplete="username"
                enterkeyhint="send"
                required
              >
            </div>
            <button type="submit" class="btn btn-primary w-100" :disabled="cargando">
              {{ cargando ? 'Enviando...' : 'Enviar Instrucciones' }}
            </button>
          </form>
          <div v-if="mensaje" class="alert alert-success mt-3 mb-0" role="status">{{ mensaje }}</div>
          <div v-if="error" class="alert alert-danger mt-3 mb-0" role="alert">{{ error }}</div>
          <div class="mt-3">
            <RouterLink to="/loginPerfil" class="btn btn-secondary w-100">Volver a Iniciar Sesión</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>