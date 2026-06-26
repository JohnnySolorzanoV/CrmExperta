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
  <section class="login-shell">
    <div class="login-grid">
      <aside class="identity-panel" aria-label="Contexto del portal legal">
        <h1 class="identity-title">Acceso seguro a tu caso</h1>
        <p class="identity-copy">
          Revisa avances, documentos y proximas citas desde un unico espacio,
          con el mismo criterio legal que recibes en consulta.
        </p>
        <ul class="identity-list">
          <li>Seguimiento claro del estado de tu proceso.</li>
          <li>Historial de interacciones y reservas actualizado.</li>
          <li>Canal directo con el equipo de Experta y Abogados.</li>
        </ul>
      </aside>

      <div class="form-panel">
        <div class="form-card">
          <header class="form-header">
            <h2>Iniciar sesion</h2>
          </header>

          <form class="login-form" @submit.prevent="iniciarSesion">
            <div class="field-group">
              <label for="email" class="form-label">Correo electronico</label>
              <input
                id="email"
                v-model="email"
                type="email"
                class="field-input"
                placeholder="tu@correo.com"
                autocomplete="email"
                required
              >
            </div>

            <div class="field-group">
              <label for="password" class="form-label">Contrasena</label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="field-input"
                placeholder="Ingresa tu contrasena"
                autocomplete="current-password"
                required
              >
            </div>

            <div v-if="usuarioStore.error" class="form-error" role="alert">
              {{ usuarioStore.error }}
            </div>

            <button type="submit" class="submit-btn" :disabled="usuarioStore.cargando">
              {{ usuarioStore.cargando ? 'Validando acceso...' : 'Acceder a mi expediente' }}
            </button>

            <RouterLink to="/crearPerfil" class="register-link">Aun no tienes cuenta? Registrate como cliente</RouterLink>
          </form>

          <div class="form-footer">
            <RouterLink to="/recuperarContrasena" class="recover-link">Recuperar contrasena</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-shell {
  --obsidian-ink: #161a24;
  --parchment-mist: #eef1f6;
  --verdict-gold: #c9a44c;
  --docket-blue: #2a3f66;
  --alert-burgundy: #8e2c3b;
  width: min(1080px, 100%);
  margin: clamp(1.5rem, 4vw, 3.25rem) auto;
  padding: 0 0.25rem;
}

.login-grid {
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  background: rgba(238, 241, 246, 0.84);
  border: 1px solid rgba(22, 26, 36, 0.18);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 22px 60px rgba(22, 26, 36, 0.2);
}

.identity-panel {
  padding: clamp(1.5rem, 4vw, 2.6rem);
  background:
    linear-gradient(90deg, rgba(218, 182, 86, 0.16), rgba(218, 182, 86, 0)),
    rgba(33, 37, 41, 0.92);
  color: var(--parchment-mist);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.1rem;
  border-bottom: 2px solid var(--bs-primary);
  backdrop-filter: blur(3px);
}

.identity-title {
  margin: 0;
  font-size: clamp(2rem, 2.8vw, 2.65rem);
  line-height: 0.95;
  font-weight: 600;
  color: #fff6dc;
}

.identity-copy {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.55;
  color: rgba(238, 241, 246, 0.9);
  max-width: 34ch;
}

.identity-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.65rem;
}

.identity-list li {
  position: relative;
  padding-left: 1.15rem;
  font-size: 0.92rem;
  line-height: 1.45;
  color: rgba(238, 241, 246, 0.9);
}

.identity-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.48rem;
  width: 0.46rem;
  height: 0.46rem;
  border-radius: 999px;
  background: var(--verdict-gold);
}

.form-panel {
  padding: clamp(1rem, 3vw, 1.8rem);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(238, 241, 246, 0.92), rgba(233, 236, 241, 0.82));
}

.form-card {
  width: min(470px, 100%);
  padding: clamp(1.15rem, 2.5vw, 1.85rem);
  border-radius: 16px;
  border: 1px solid rgba(22, 26, 36, 0.16);
  background: rgba(255, 255, 255, 0.92);
  position: relative;
  box-shadow: 0 12px 32px rgba(22, 26, 36, 0.12);
}


.form-header {
  padding-top: 1.7rem;
  margin-bottom: 1.2rem;
  border-top: 3px solid rgba(201, 164, 76, 0.85);
}

.form-header h2 {
  margin: 0;
  color: var(--obsidian-ink);
  font-weight: 600;
  font-size: clamp(1.8rem, 2.2vw, 2.15rem);
}

.login-form {
  display: grid;
  gap: 0.95rem;
}

.field-group {
  display: grid;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.84rem;
  letter-spacing: 0.06em;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(22, 26, 36, 0.8);
}

.field-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(42, 63, 102, 0.32);
  background: #fbfbfd;
  color: #1c2130;
  min-height: 46px;
  padding: 0.68rem 0.82rem;
  font-size: 0.97rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.field-input::placeholder {
  color: rgba(28, 33, 48, 0.55);
}

.field-input:focus-visible {
  outline: none;
  border-color: var(--verdict-gold);
  box-shadow: 0 0 0 3px rgba(201, 164, 76, 0.22);
  background: #fffef9;
}

.form-error {
  border: 1px solid rgba(142, 44, 59, 0.35);
  color: #651824;
  background: rgba(142, 44, 59, 0.09);
  border-radius: 10px;
  padding: 0.64rem 0.72rem;
  font-size: 0.92rem;
}

.submit-btn {
  margin-top: 0.2rem;
  width: 100%;
  min-height: 47px;
  border: 1px solid color-mix(in srgb, var(--bs-primary) 78%, var(--bs-dark) 22%);
  border-radius: 10px;
  background: linear-gradient(
    130deg,
    color-mix(in srgb, var(--bs-primary) 86%, #ffffff 14%),
    var(--bs-primary)
  );
  color: var(--bs-dark);
  font-weight: 700;
  letter-spacing: 0.02em;
  transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.2s ease;
}

.submit-btn:hover:enabled {
  transform: translateY(-1px);
  box-shadow: 0 9px 18px color-mix(in srgb, var(--bs-primary) 35%, transparent);
}

.submit-btn:focus-visible {
  outline: 2px solid var(--verdict-gold);
  outline-offset: 2px;
}

.submit-btn:disabled {
  opacity: 0.72;
  cursor: wait;
}

.register-link {
  color: var(--bs-primary);
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 600;
  text-align: center;
  padding: 0.4rem 0;
}

.register-link:hover,
.register-link:focus-visible {
  color: color-mix(in srgb, var(--bs-primary) 72%, var(--bs-dark) 28%);
  text-decoration: underline;
}

.form-footer {
  margin-top: 0.65rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(42, 63, 102, 0.22);
  text-align: center;
}

.recover-link {
  color: rgba(42, 63, 102, 0.95);
  text-decoration: none;
  font-size: 0.9rem;
}

.recover-link:hover,
.recover-link:focus-visible {
  text-decoration: underline;
}

@media (max-width: 940px) {
  .login-grid {
    grid-template-columns: 1fr;
  }

  .identity-panel {
    padding-bottom: 1.3rem;
    gap: 0.8rem;
    border-bottom: 2px solid var(--bs-primary);
  }

  .identity-copy {
    max-width: none;
  }
}

@media (max-width: 560px) {
  .login-shell {
    margin-top: 0.95rem;
    padding: 0;
  }

  .login-grid {
    border-radius: 16px;
  }

  .form-panel,
  .identity-panel {
    padding: 1rem;
  }

  .form-card {
    padding: 1rem;
  }

  .form-header {
    padding-top: 1.45rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .field-input,
  .submit-btn {
    transition: none;
  }
}
</style>