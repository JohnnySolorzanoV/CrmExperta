<script setup>
import { ref } from 'vue'
import { useCrearPerfilStore } from '../stores/crearPerfilStore'
import { useRouter } from 'vue-router'

const crearPerfilStore = useCrearPerfilStore()
const nombre = ref(null)
const identificacion = ref(null)
const telefono = ref(null)
const correo = ref(null)
const contrasena = ref(null)
const direccion = ref(null)
const router = useRouter()
async function registrarCliente() {
  await crearPerfilStore.crearPerfil(identificacion.value, nombre.value, correo.value, contrasena.value)
    if (crearPerfilStore.usuario)
      router.push('/loginPerfil')
}



</script>

<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="card p-4">
          <h2 class="mb-4">Registrar Nuevo Cliente</h2>

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
                <input type="tel" class="form-control" id="telefono" placeholder="+57 300 1234567" required v-model="telefono">
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

            <button type="submit" class="btn btn-success w-100">Registrar Cliente</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>