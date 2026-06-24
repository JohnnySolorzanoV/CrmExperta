<script setup>
import { ref } from 'vue'
import { useCrearPerfilStore } from '../stores/crearPerfilStore'
import { useUsuarioStore } from '../stores/usuariostore'
import { useRouter } from 'vue-router'

const crearPerfilStore = useCrearPerfilStore()
const usuarioStore = useUsuarioStore()
const nombre = ref(null)
const identificacion = ref(null)
const telefono = ref(null)
const correo = ref(null)
const contrasena = ref(null)
const direccion = ref(null)
const router = useRouter()
async function registrarCliente() {
  const registroExitoso = await crearPerfilStore.crearPerfil({
    identificacion: identificacion.value,
    nombre: nombre.value,
    correo: correo.value,
    contrasena: contrasena.value,
    direccion: direccion.value,
    telefono: telefono.value
  })

  if (!registroExitoso) return

  const loginExitoso = await usuarioStore.iniciarSesion(correo.value, contrasena.value)
  if (!loginExitoso || !usuarioStore.usuario?.roles) return

  if (usuarioStore.usuario.roles.includes('administrador')) {
    router.push('/admin')
  } else if (usuarioStore.usuario.roles.includes('abogado')) {
    router.push('/citas')
  } else {
    router.push('/chatbot')
  }
}



</script>

<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="card p-4">
          <h2 class="mb-4">Registrar Nuevo Cliente</h2>
          <div v-if="crearPerfilStore.error" class="alert alert-danger">{{ crearPerfilStore.error }}</div>

          <form @submit.prevent="registrarCliente">
            <div class="mb-3">
              <label for="nombre" class="form-label">Nombre Completo</label>
              <input type="text" class="form-control" id="nombre" placeholder="Nombre completo" required v-model="nombre">
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label for="identificacion" class="form-label">Identificación</label>
                <input type="text" class="form-control" id="identificacion" placeholder="Número de documento" required v-model="identificacion">
              </div>
              <div class="col-md-6 mb-3">
                <label for="telefono" class="form-label">Teléfono</label>
                <input type="tel" class="form-control" id="telefono" placeholder="+593 99 999 9999" required v-model="telefono">
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label for="correo" class="form-label">Correo Electrónico</label>
                <input type="email" class="form-control" id="correo" placeholder="cliente@correo.com" required v-model="correo">
              </div>
              <div class="col-md-6 mb-3">
                <label for="contrasena" class="form-label">Contraseña</label>
                <input type="password" class="form-control" id="contrasena" placeholder="Contraseña" required v-model="contrasena">
              </div>
            </div>

            <div class="mb-3">
              <label for="direccion" class="form-label">Dirección</label>
              <input type="text" class="form-control" id="direccion" placeholder="Dirección del cliente" required v-model="direccion">
            </div>

            <button type="submit" class="btn btn-success w-100" :disabled="crearPerfilStore.cargando || usuarioStore.cargando">
              {{ (crearPerfilStore.cargando || usuarioStore.cargando) ? 'Creando cuenta...' : 'Registrar cuenta' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>