<script setup>
import { RouterView, useRoute, RouterLink } from 'vue-router'
const route = useRoute()
</script>

// el p es solo para saber en que ventada me encuentro
<template>
  <p><strong>Ruta actual:</strong> {{ route.path }}</p>
  <nav class="container"> 
    <RouterLink to="/frontendCRM"> Inicio </RouterLink>
    <RouterLink to="/inicioSesion"> Inicio de sesión </RouterLink>
    <RouterLink to="/admin"> Admin </RouterLink>
  </nav>
  <main class="container">
    <RouterView />
  </main>
</template>
