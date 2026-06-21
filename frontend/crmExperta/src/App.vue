<script setup>
import { RouterView, useRoute, RouterLink } from 'vue-router'
import imgCRM from './assets/logoExperta.png'
import { useUsuarioStore } from './stores/usuariostore'
const route = useRoute()
const usuarioStore = useUsuarioStore()
</script>

<template>
  <div class="bg-light-subtle ">
  <nav class="navbar bg-light">
    <div class="container-fluid" >
      <a class="navbar-brand" href="#">
        <img :src="imgCRM" alt="Logo" width="30" height="30"
          class="d-inline-block align-text-top">  
        EXPERTA&ABOGADOS
      </a>
    </div>
  </nav>  
    {{ usuarioStore.usuario }}  
    <nav class="container m-center text-center mb-5 mt-2">
    <RouterLink type="button" class="btn btn-primary mx-1 my-1" to="/frontendCRM "> Inicio Cliente </RouterLink>
    <RouterLink type="button" class="btn btn-primary mx-1 my-1" to="/inicio"> Inicio </RouterLink>
    <RouterLink type="button" class="btn btn-primary mx-1 my-1" to="/admin"> Admin </RouterLink>
    <RouterLink type="button" class="btn btn-primary mx-1 my-1" to="/loginPerfil"> Iniciar sesión </RouterLink>
    <RouterLink type="button" class="btn btn-primary mx-1 my-1" to="/crearPerfil"> Registrarse </RouterLink>
    <RouterLink type="button" class="btn btn-primary mx-1 my-1" to="/inicioAbogado"> Inicio Abogado </RouterLink>
  </nav>
  <main class="container">
    <RouterView />
  </main>
  </div>
</template>

<style scoped>
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
} 

</style>