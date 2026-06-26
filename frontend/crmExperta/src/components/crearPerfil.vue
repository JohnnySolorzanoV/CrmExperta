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
  <section class="register-shell">
    <div class="register-grid">
      <aside class="identity-panel" aria-label="Beneficios y flujo del chatbot legal">
        <h1 class="identity-title">Abre tu cuenta y activa tu orientacion legal asistida</h1>
        <p class="identity-copy">
          Este registro te habilita un espacio privado para consultar tu situacion,
          organizar citas y mantener trazabilidad de cada paso.
        </p>

        <div class="chatbot-flow">
          <h2>Como funciona el chatbot</h2>
          <ol>
            <li><strong>Describe tu caso:</strong> cuentale al asistente que paso y que necesitas resolver.</li>
            <li><strong>Recibe orientacion inicial:</strong> el chatbot te sugiere ruta, prioridades y siguiente accion.</li>
            <li><strong>Agenda tu cita:</strong> desde la misma conversacion eliges horario y confirmas reserva.</li>
            <li><strong>Da seguimiento:</strong> revisa avances y vuelve al chat cuando tengas nuevos documentos o dudas.</li>
          </ol>
        </div>

        <p class="identity-note">
          El chatbot brinda guia inicial y organizacion del proceso. Para decisiones juridicas finales,
          siempre te acompanara un abogado.
        </p>
      </aside>

      <div class="form-panel">
        <div class="form-card">
          <header class="form-header">
            <h2>Crear perfil de cliente</h2>
            <p>Completa tus datos para ingresar directamente al chatbot al finalizar.</p>
          </header>

          <div v-if="crearPerfilStore.error" class="form-error" role="alert">
            {{ crearPerfilStore.error }}
          </div>

          <form class="register-form" @submit.prevent="registrarCliente">
            <div class="field-group">
              <label for="nombre" class="form-label">Nombre completo</label>
              <input id="nombre" v-model="nombre" type="text" class="field-input" placeholder="Nombre y apellido" required>
            </div>

            <div class="field-row">
              <div class="field-group">
                <label for="identificacion" class="form-label">Identificacion</label>
                <input id="identificacion" v-model="identificacion" type="text" class="field-input" placeholder="Numero de documento" required>
              </div>
              <div class="field-group">
                <label for="telefono" class="form-label">Telefono</label>
                <input id="telefono" v-model="telefono" type="tel" class="field-input" placeholder="+593 99 999 9999" required>
              </div>
            </div>

            <div class="field-row">
              <div class="field-group">
                <label for="correo" class="form-label">Correo electronico</label>
                <input id="correo" v-model="correo" type="email" class="field-input" placeholder="cliente@correo.com" required>
              </div>
              <div class="field-group">
                <label for="contrasena" class="form-label">Contrasena</label>
                <input id="contrasena" v-model="contrasena" type="password" class="field-input" placeholder="Crea una contrasena segura" required>
              </div>
            </div>

            <div class="field-group">
              <label for="direccion" class="form-label">Direccion</label>
              <input id="direccion" v-model="direccion" type="text" class="field-input" placeholder="Direccion del cliente" required>
            </div>

            <button type="submit" class="submit-btn" :disabled="crearPerfilStore.cargando || usuarioStore.cargando">
              {{ (crearPerfilStore.cargando || usuarioStore.cargando) ? 'Creando cuenta...' : 'Registrar cuenta y continuar al chatbot' }}
            </button>

            <RouterLink to="/" class="back-login-link">Volver a iniciar sesion</RouterLink>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.register-shell {
  --obsidian-ink: #161a24;
  --parchment-mist: #eef1f6;
  --verdict-gold: #c9a44c;
  width: min(1180px, 100%);
  margin: clamp(1.3rem, 3.8vw, 3.15rem) auto;
  padding: 0 0.25rem;
}

.register-grid {
  display: grid;
  grid-template-columns: 0.95fr 1.08fr;
  background: rgba(238, 241, 246, 0.84);
  border: 1px solid rgba(22, 26, 36, 0.18);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 22px 60px rgba(22, 26, 36, 0.2);
}

.identity-panel {
  padding: clamp(1.4rem, 3.8vw, 2.55rem);
  background:
    linear-gradient(90deg, rgba(218, 182, 86, 0.16), rgba(218, 182, 86, 0)),
    rgba(33, 37, 41, 0.92);
  color: var(--parchment-mist);
  border-bottom: 2px solid var(--bs-primary);
  backdrop-filter: blur(3px);
  display: grid;
  gap: 1rem;
  align-content: center;
}

.identity-title {
  margin: 0;
  font-size: clamp(1.9rem, 2.8vw, 2.5rem);
  line-height: 0.98;
  font-weight: 600;
  color: #fff6dc;
}

.identity-copy {
  margin: 0;
  font-size: 0.97rem;
  line-height: 1.55;
  color: rgba(238, 241, 246, 0.92);
  max-width: 42ch;
}

.chatbot-flow {
  border: 1px solid rgba(238, 241, 246, 0.2);
  border-radius: 14px;
  background: rgba(22, 26, 36, 0.22);
  padding: 0.95rem 0.95rem 0.8rem;
}

.chatbot-flow h2 {
  margin: 0 0 0.65rem;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--verdict-gold);
  font-weight: 700;
}

.chatbot-flow ol {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.45rem;
}

.chatbot-flow li {
  font-size: 0.9rem;
  line-height: 1.45;
  color: rgba(238, 241, 246, 0.9);
}

.identity-note {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: rgba(238, 241, 246, 0.72);
  padding-top: 0.35rem;
  border-top: 1px dashed rgba(238, 241, 246, 0.26);
}

.form-panel {
  padding: clamp(1rem, 3vw, 1.8rem);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(238, 241, 246, 0.92), rgba(233, 236, 241, 0.82));
}

.form-card {
  width: min(640px, 100%);
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
  font-size: clamp(1.65rem, 2.2vw, 2.05rem);
}

.form-header p {
  margin: 0.35rem 0 0;
  color: rgba(22, 26, 36, 0.75);
  font-size: 0.92rem;
}

.register-form {
  display: grid;
  gap: 0.95rem;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.field-group {
  display: grid;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.82rem;
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
  margin-bottom: 0.8rem;
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
  letter-spacing: 0.01em;
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

.back-login-link {
  color: rgba(42, 63, 102, 0.95);
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 600;
  text-align: center;
  padding: 0.3rem 0;
}

.back-login-link:hover,
.back-login-link:focus-visible {
  color: color-mix(in srgb, var(--bs-primary) 72%, var(--bs-dark) 28%);
  text-decoration: underline;
}

@media (max-width: 980px) {
  .register-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .register-shell {
    margin-top: 0.95rem;
    padding: 0;
  }

  .register-grid {
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

  .field-row {
    grid-template-columns: 1fr;
    gap: 0.95rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .field-input,
  .submit-btn {
    transition: none;
  }
}
</style>