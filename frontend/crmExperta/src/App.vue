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
    <nav class="navbar navbar-premium" aria-label="Navegacion principal">
      <div class="container-fluid navbar-shell">
        <RouterLink class="navbar-brand brand-lockup mb-0" to="/inicio">
          <span class="brand-seal">
            <img :src="imgCRM" alt="Logo de Experta y Abogados" width="30" height="30">
          </span>
          <span class="brand-copy">
            <span class="brand-title">EXPERTA&amp;ABOGADOS</span>
            <span class="brand-subtitle">Defensa legal con estrategia</span>
          </span>
        </RouterLink>

        <div class="navbar-groups">
          <div class="nav-group nav-group-secondary" aria-label="Accesos generales">
            <RouterLink class="nav-text-link" to="/sobre-nosotros">
              Sobre nosotros
            </RouterLink>
          </div>

          <div class="nav-group nav-group-primary" aria-label="Accesos de cuenta">
            <template v-if="!autenticado">
              <RouterLink class="nav-text-link" to="/loginPerfil">Iniciar sesion</RouterLink>
              <RouterLink class="nav-text-link" to="/crearPerfil">Agenda tu cita</RouterLink>
            </template>
            <template v-else>
              <RouterLink v-if="esAbogado" class="nav-text-link" to="/inicioAbogado">Citas y casos</RouterLink>
              <RouterLink v-if="esCliente" class="nav-text-link" to="/chatbot">Agendar chatbot</RouterLink>
              <RouterLink v-if="esCliente" class="nav-text-link" to="/mis-reservas">Mis reservas</RouterLink>
              <button type="button" class="nav-text-link nav-text-link-danger" @click="cerrarSesion">Cerrar sesion</button>
            </template>
          </div>
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
  gap: 12px;
  text-decoration: none;
}

.navbar-premium {
  border-bottom: 2px solid var(--bs-primary);
  background:
    linear-gradient(90deg, rgba(218, 182, 86, 0.16), rgba(218, 182, 86, 0)),
    rgba(33, 37, 41, 0.92);
  backdrop-filter: blur(3px);
}

.navbar-shell {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1rem;
}

.brand-lockup {
  min-width: 260px;
  max-width: 100%;
}

.brand-seal {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(218, 182, 86, 0.5);
  background: rgba(228, 228, 228, 0.1);
}

.brand-seal img {
  display: block;
}

.brand-copy {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.05;
}

.brand-title {
  color: var(--bs-light);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.brand-subtitle {
  color: rgba(228, 228, 228, 0.8);
  font-size: 0.69rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 0.18rem;
}

.navbar-groups {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.9rem 1.35rem;
}

.nav-group {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.85rem 1.05rem;
}

.nav-group-secondary {
  padding-right: 1.05rem;
  border-right: 1px solid rgba(228, 228, 228, 0.28);
}

.nav-text-link {
  min-height: 34px;
  padding: 0;
  border: 0;
  background: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--bs-light);
  transition: color 0.2s ease, text-decoration-color 0.2s ease, transform 0.2s ease;
  text-underline-offset: 0.24em;
  text-decoration-thickness: 2px;
  text-decoration-color: transparent;
  cursor: pointer;
  line-height: 1.1;
}

.nav-text-link:hover {
  color: var(--bs-primary);
  text-decoration: underline;
  text-decoration-color: currentColor;
  transform: translateY(-1px);
}

.nav-text-link.router-link-active,
.nav-text-link.router-link-exact-active {
  color: var(--bs-primary);
  text-decoration: underline;
  text-decoration-color: currentColor;
}

.nav-text-link:focus-visible {
  outline: none;
  color: var(--bs-primary);
  text-decoration: underline;
  text-decoration-color: currentColor;
}

.nav-text-link-primary {
  color: var(--bs-dark);
}

.nav-text-link-primary:hover,
.nav-text-link-primary:focus-visible {
  color: var(--bs-dark);
  text-decoration-color: var(--bs-dark);
}

.nav-text-link-danger {
  color: #ffe0e0;
  background: rgba(152, 36, 36, 0.55);
  border: 1px solid rgba(255, 205, 205, 0.45);
  border-radius: 8px;
  padding: 0 0.78rem;
}

.nav-text-link-danger:hover {
  color: #fff3f3;
  background: rgba(170, 42, 42, 0.72);
  text-decoration: none;
}

.nav-text-link-danger:focus-visible {
  color: #fff3f3;
  text-decoration: none;
}

@media (max-width: 1024px) {
  .navbar-shell {
    align-items: center;
  }

  .navbar-groups {
    width: 100%;
    justify-content: center;
    margin-left: 0;
  }
}

@media (max-width: 720px) {
  .brand-lockup {
    min-width: 0;
  }

  .brand-title {
    font-size: 0.86rem;
  }

  .brand-subtitle {
    font-size: 0.64rem;
  }

  .navbar-groups {
    gap: 0.75rem;
  }

  .nav-group {
    width: 100%;
    gap: 0.7rem;
    justify-content: center;
  }

  .nav-group-secondary {
    border-right: none;
    border-bottom: 1px solid rgba(228, 228, 228, 0.24);
    padding-right: 0;
    padding-bottom: 0;
  }

  .nav-text-link {
    flex: 1 1 auto;
    width: 100%;
    min-height: 36px;
    justify-content: center;
  }
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