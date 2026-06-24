<script setup>
import {ref} from 'vue'
import { useUsuarioStore } from '../stores/usuariostore'   
import { useRouter } from 'vue-router'


const usuarioStore = useUsuarioStore()
const email = ref(null)
const password = ref(null)
const router = useRouter()
async function iniciarSesion() {
  const loginExitoso = await usuarioStore.iniciarSesion(email.value, password.value)
  if (!loginExitoso || !usuarioStore.usuario?.roles) return

  if (usuarioStore.usuario.roles.includes('administrador')) {
      router.push('/admin')
  } else if (usuarioStore.usuario.roles.includes('cliente')) {
      router.push('/chatbot')
  } else if (usuarioStore.usuario.roles.includes('abogado')) {
      router.push('/inicioAbogado')
  }
}

</script>

<template>
  <div class="container mt-5 text-center">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card p-5">
          <h2 class="mb-4">Iniciar Sesión</h2>
          <form @submit.prevent="iniciarSesion">
            <div class="mb-3">
              <label for="email" class="form-label">Correo Electrónico</label>
              <input type="email" class="form-control" id="email" placeholder="tu@correo.com" required v-model="email">
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <input type="password" class="form-control" id="password" placeholder="Contraseña" required v-model="password">
            </div>
            <div v-if="usuarioStore.error" class="alert alert-danger py-2" role="alert">
              {{ usuarioStore.error }}
            </div>
            <button type="submit" class="btn btn-primary w-100" :disabled="usuarioStore.cargando">
              {{ usuarioStore.cargando ? 'Ingresando...' : 'Ingresar' }}
            </button>
            <RouterLink to="/crearPerfil" class="btn btn-outline-primary w-100 mt-2">Registrate como cliente</RouterLink>
          </form>
          <div class="mt-3">
            <RouterLink to="/recuperarContrasena" class="text-decoration-none">¿Olvidaste tu contraseña?</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>