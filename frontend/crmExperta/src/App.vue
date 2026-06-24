<script setup>
import { computed } from 'vue'
import { RouterView, RouterLink, useRouter } from 'vue-router'
import imgCRM from './assets/logoExperta.png'
import { useUsuarioStore } from './stores/usuariostore'

const router = useRouter()
const usuarioStore = useUsuarioStore()
const autenticado = computed(() => Boolean(usuarioStore.token && usuarioStore.usuario))
const esCliente = computed(() => Boolean(usuarioStore.usuario?.roles?.includes('cliente')))
const esAbogado = computed(() => Boolean(usuarioStore.usuario?.roles?.includes('abogado')))

function cerrarSesion() {
  usuarioStore.cerrarSesion()
  router.push('/loginPerfil')
}
</script>

<template>
  <div class="imagenFondo  ">
    <nav class="navbar bg-light">
      <div class="container-fluid d-flex align-items-center gap-2 flex-wrap">
        <RouterLink class="navbar-brand mb-0" to="/inicio">
          <img :src="imgCRM" alt="Logo" width="30" height="30" class="d-inline-block align-text-top">
          EXPERTA&ABOGADOS
        </RouterLink>
        <div class="ms-auto d-flex align-items-center gap-2 flex-wrap justify-content-end">
          <RouterLink class="btn btn-dark nav-action" to="/sobre-nosotros">
            Sobre nosotros
          </RouterLink>
          <template v-if="!autenticado">
            <RouterLink class="btn btn-dark nav-action" to="/loginPerfil">Iniciar sesión</RouterLink>
            <RouterLink class="btn btn-dark nav-action" to="/crearPerfil">Agenda tu cita</RouterLink>
          </template>
          <template v-else>
            <RouterLink v-if="esAbogado" class="btn btn-dark nav-action" to="/inicioAbogado">Citas y casos</RouterLink>
            <RouterLink v-if="esCliente" class="btn btn-dark nav-action" to="/chatbot">Agendar chatbot</RouterLink>
            <RouterLink v-if="esCliente" class="btn btn-dark nav-action" to="/mis-reservas">Mis reservas</RouterLink>
            <button type="button" class="btn btn-dark nav-action" @click="cerrarSesion">Cerrar sesión</button>
          </template>
        </div>
      </div>
    </nav>

    <main class="container">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  min-height: 100%;
  margin: 0;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-action {
  min-width: 150px;
  font-weight: 600;
}

.imagenFondo {
  position: relative;
  background-image: url('./assets/imagenFondo.jpeg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
  width: 100%;
  background-attachment: fixed;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.imagenFondo::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(200, 200, 200, 0.8);
  pointer-events: none;
}

.imagenFondo > * {
  position: relative;
  z-index: 1;
}

</style>