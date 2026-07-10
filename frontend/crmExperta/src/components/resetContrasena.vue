<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsuarioStore } from '../stores/usuariostore'

const route = useRoute()
const router = useRouter()
const usuarioStore = useUsuarioStore()

const token = computed(() => String(route.params?.token || ''))
const nuevaContrasena = ref('')
const confirmarContrasena = ref('')
const cargando = ref(false)
const error = ref('')
const mensaje = ref('')

async function restablecer() {
  error.value = ''
  mensaje.value = ''

  if (!token.value) {
    error.value = 'El enlace no es valido o no contiene token.'
    return
  }
  if (nuevaContrasena.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (nuevaContrasena.value !== confirmarContrasena.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  cargando.value = true
  try {
    const respuesta = await usuarioStore.restablecerContrasena(token.value, nuevaContrasena.value)
    mensaje.value = respuesta?.data?.mensaje || 'Contraseña actualizada correctamente.'
    nuevaContrasena.value = ''
    confirmarContrasena.value = ''
    if (respuesta?.success) {
      await router.push('/loginPerfil')
    }
  } catch (err) {
    const mensajeError = err?.message || ''
    if (mensajeError.toLowerCase().includes('token inválido') || mensajeError.toLowerCase().includes('token invalido')) {
      error.value = 'Token inválido. Solicita el cambio de contraseña nuevamente.'
    } else {
      error.value = mensajeError || 'No se pudo restablecer la contraseña.'
    }
  } finally {
    cargando.value = false
  }
}

function irALogin() {
  router.push('/loginPerfil')
}
</script>

<template>
  <div class="container mt-5 text-center">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card p-5">
          <h2 class="mb-4">Restablecer Contraseña</h2>
          <p class="text-muted mb-4">Define una nueva contraseña para tu cuenta.</p>

          <form @submit.prevent="restablecer">
            <div class="mb-3 text-start">
              <label for="new-password" class="form-label">Nueva Contraseña</label>
              <input
                id="new-password"
                v-model="nuevaContrasena"
                type="password"
                class="form-control"
                autocomplete="new-password"
                minlength="8"
                required
              >
            </div>

            <div class="mb-3 text-start">
              <label for="confirm-password" class="form-label">Confirmar Contraseña</label>
              <input
                id="confirm-password"
                v-model="confirmarContrasena"
                type="password"
                class="form-control"
                autocomplete="new-password"
                minlength="8"
                required
              >
            </div>

            <button type="submit" class="btn btn-primary w-100" :disabled="cargando">
              {{ cargando ? 'Actualizando...' : 'Actualizar Contraseña' }}
            </button>
          </form>

          <div v-if="mensaje" class="alert alert-success mt-3 mb-0" role="status">
            {{ mensaje }}
          </div>
          <div v-if="error" class="alert alert-danger mt-3 mb-0" role="alert">
            {{ error }}
          </div>

          <div class="mt-3">
            <button type="button" class="btn btn-secondary w-100" @click="irALogin">
              Volver a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
