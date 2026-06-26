<script setup>
const indicadoresClave = [
  { valor: '4h', etiqueta: 'Tiempo promedio de primera respuesta' },
  { valor: '312', etiqueta: 'Consultas atendidas en los ultimos 12 meses' },
  { valor: '92%', etiqueta: 'Clientes que califican la atencion como clara y oportuna' },
]

const areasPractica = [
  'Derecho familiar: custodia, regimen de visitas, alimentos y acuerdos de convivencia.',
  'Derecho civil: contratos, obligaciones y responsabilidad civil para personas y pequenas empresas.',
  'Derecho sucesorio: testamentos, particion de bienes y acompanamiento en procesos hereditarios.',
  'Leyes de transito: defensa en infracciones, impugnaciones y regularizacion documental.',
  'Constitucional: acciones de proteccion y defensa de derechos fundamentales.',
]

const bitacoraDespacho = [
  {
    etapa: 'Diagnostico legal',
    detalle:
      'Escuchamos tu caso, revisamos documentos iniciales y definimos el riesgo legal real de la situacion.',
  },
  {
    etapa: 'Estrategia y ruta',
    detalle: 'Te entregamos una hoja de ruta concreta con tiempos estimados, prioridades y responsables.',
  },
  {
    etapa: 'Gestion activa',
    detalle:
      'Preparamos escritos, coordinamos audiencias y te mantenemos al tanto con avances sin lenguaje tecnico innecesario.',
  },
  {
    etapa: 'Cierre y seguimiento',
    detalle:
      'Cerramos el proceso con recomendaciones practicas para proteger tu posicion en el mediano plazo.',
  },
]

const metodoEquipo = [
  'Atencion personalizada por caso, sin respuestas genericas.',
  'Explicaciones en lenguaje claro antes de cada decision relevante.',
  'Priorizacion de acuerdos viables cuando reducen desgaste y tiempo.',
]
</script>

<template>
  <section class="landing-inicio">
    <header class="hero-legal">
      <h1>Defensa legal con estrategia, claridad y acompanamiento constante.</h1>
      <p class="hero-copy">
        En Experta&Abogados trabajamos casos familiares, civiles y sucesorios con un metodo de despacho que
        combina analisis tecnico y comunicacion directa para que sepas que pasa en cada etapa de tu proceso.
      </p>
      <div class="hero-actions">
        <RouterLink class="btn btn-primary btn-cta" to="/crearPerfil">Agendar primera consulta</RouterLink>
        <RouterLink class="btn btn-outline-light btn-cta" to="/loginPerfil">Iniciar sesion</RouterLink>
      </div>
    </header>

    <section class="panel panel-indicadores full-width-band" aria-label="Indicadores del despacho">
      <div class="band-inner indicadores-grid">
        <article v-for="indicador in indicadoresClave" :key="indicador.etiqueta" class="indicador-card">
          <p class="indicador-valor">{{ indicador.valor }}</p>
          <p class="indicador-etiqueta">{{ indicador.etiqueta }}</p>
        </article>
      </div>
    </section>

    <section class="panel panel-areas" aria-labelledby="areas-practica">
      <h2 id="areas-practica">Areas de practica para casos de alta sensibilidad.</h2>
      <ul class="areas-lista">
        <li v-for="area in areasPractica" :key="area">{{ area }}</li>
      </ul>
    </section>

    <section class="panel bitacora-panel full-width-band" aria-labelledby="bitacora-despacho">
      <div class="band-inner">
        <h2 id="bitacora-despacho">Asi acompanamos cada caso desde la primera consulta.</h2>
        <ol class="bitacora-lista">
          <li v-for="(item, index) in bitacoraDespacho" :key="item.etapa" class="bitacora-item">
            <p class="bitacora-index">{{ String(index + 1).padStart(2, '0') }}</p>
            <div>
              <h3>{{ item.etapa }}</h3>
              <p>{{ item.detalle }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="panel panel-equipo" aria-labelledby="metodo-equipo">
      <h2 id="metodo-equipo">Criterio legal riguroso y atencion humana en cada decision.</h2>
      <ul class="metodo-lista">
        <li v-for="item in metodoEquipo" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section class="panel panel-contacto" aria-labelledby="contacto-despacho">
      <h2 id="contacto-despacho">Agenda una orientacion legal hoy.</h2>
      <p class="contacto-direccion">Calle Imbabura entre Bolivar y Fernando Valdivieso 158-14</p>
      <div class="contacto-actions">
        <a
          class="contacto-link"
          href="https://www.instagram.com/expertaabogados?igsh=MXZzaHVpcXIyMHNrcg=="
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
        </a>
        <a class="contacto-link" href="https://w.app/adzhpg" target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
      </div>
      <div class="hero-actions contacto-cta">
        <RouterLink class="btn btn-primary btn-cta" to="/crearPerfil">Crear cuenta y reservar</RouterLink>
        <RouterLink class="btn btn-outline-light btn-cta" to="/loginPerfil">Ya tengo cuenta</RouterLink>
      </div>
    </section>
  </section>
</template>

<style scoped>
.landing-inicio {
  --obsidiana: #0f172a;
  --bronce-legal: #b08b57;
  --marfil-notarial: #f7f3ec;
  --grafito: #334155;
  --verde-resolucion: #3d7a66;
  --humo: #e2e8f0;
  max-width: 1120px;
  margin: 2.8rem auto 4.25rem;
  padding: 0 0.75rem 2rem;
  display: grid;
  gap: 2rem;
}

.hero-legal {
  padding: 8rem;
  border: 1px solid color-mix(in srgb, var(--bs-light, #e4e4e4) 25%, transparent);
  border-bottom: 3px solid var(--bs-primary, #dab656);
  background:
    linear-gradient(90deg, rgba(218, 182, 86, 0.16), rgba(218, 182, 86, 0)),
    rgba(33, 37, 41, 0.92);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.28);
  color: var(--marfil-notarial);
}

.hero-legal h1 {
  margin: 0;
  font-size: clamp(1.9rem, 4vw, 2.8rem);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.015em;
  max-width: 20ch;
}

.hero-copy {
  margin: 1rem 0 0;
  max-width: 65ch;
  color: color-mix(in srgb, var(--bs-light, #e4e4e4) 90%, white);
  line-height: 1.6;
}

.hero-actions {
  margin-top: 1.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.btn-cta {
  min-width: 220px;
  font-weight: 700;
}

.panel {
  border: 1px solid color-mix(in srgb, var(--bs-dark, #212529) 24%, transparent);
  background: rgba(247, 243, 236, 0.9);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  padding: 8rem;
}

.full-width-band {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  border-left: 0;
  border-right: 0;
  border-radius: 0;
  padding-left: 0;
  padding-right: 0;
}

.band-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding-left: 8rem;
  padding-right: 8rem;
}

.panel-indicadores {
  padding-top: 6rem;
  padding-bottom: 6rem;
  background: linear-gradient(180deg, rgba(247, 243, 236, 0.95), rgba(226, 232, 240, 0.95));
}

.indicadores-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.indicador-card {
  border: 1px solid color-mix(in srgb, var(--bs-primary, #dab656) 32%, transparent);
  padding: 1.15rem 1rem;
  background: rgba(255, 255, 255, 0.55);
}

.indicador-valor {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.8rem);
  font-weight: 800;
  color: var(--obsidiana);
}

.indicador-etiqueta {
  margin: 0.25rem 0 0;
  font-size: 0.84rem;
  color: var(--grafito);
  line-height: 1.35;
}

.panel h2 {
  margin: 0;
  font-size: clamp(1.2rem, 2.8vw, 1.75rem);
  color: var(--obsidiana);
  max-width: 35ch;
  line-height: 1.2;
}

.areas-lista {
  margin: 1.3rem 0 0;
  padding-left: 1.1rem;
  columns: 2;
  column-gap: 1.4rem;
}

.areas-lista li {
  break-inside: avoid;
  margin-bottom: 0.8rem;
  color: var(--grafito);
  line-height: 1.55;
}

.areas-lista li::marker {
  color: var(--bs-primary, #dab656);
}

.bitacora-panel {
  padding-top: 6rem;
  padding-bottom: 6rem;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(28, 44, 73, 0.94));
  color: var(--humo);
}

.bitacora-panel h2 {
  color: var(--marfil-notarial);
}

.bitacora-lista {
  margin: 1.4rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.7rem;
}

.bitacora-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 1.05rem;
  border-top: 1px solid rgba(226, 232, 240, 0.25);
  padding-top: 1rem;
}

.bitacora-index {
  margin: 0;
  min-width: 2.2rem;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--bs-primary, #dab656);
}

.bitacora-item h3 {
  margin: 0;
  font-size: 1rem;
  color: #f8fafc;
}

.bitacora-item p {
  margin: 0.35rem 0 0;
  line-height: 1.55;
}

.metodo-lista {
  margin: 1.2rem 0 0;
  padding-left: 1.1rem;
  color: var(--grafito);
  line-height: 1.7;
}

.metodo-lista li::marker {
  color: var(--verde-resolucion);
}

.panel-contacto {
  background: linear-gradient(180deg, rgba(51, 65, 85, 0.95), rgba(15, 23, 42, 0.95));
  border-color: color-mix(in srgb, var(--bs-primary, #dab656) 45%, transparent);
  color: #f8fafc;
}

.panel-contacto h2 {
  margin: 0;
  max-width: 33ch;
  line-height: 1.2;
  color: #f8fafc;
}

.contacto-direccion {
  margin: 0.8rem 0 0;
  color: color-mix(in srgb, #f8fafc 92%, var(--bs-primary, #dab656));
}

.contacto-actions {
  margin-top: 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.contacto-link {
  color: var(--bs-light, #e4e4e4);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  font-weight: 600;
}

.contacto-link:hover {
  color: var(--bs-primary, #dab656);
  border-bottom-color: currentColor;
}

.contacto-link:focus-visible,
.btn:focus-visible {
  outline: 2px solid var(--bs-primary, #dab656);
  outline-offset: 2px;
}

.contacto-cta {
  margin-top: 1.5rem;
}

@media (max-width: 1024px) {
  .hero-legal,
  .panel {
    padding: 3rem 2.5rem;
  }

  .band-inner {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }

  .indicadores-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .landing-inicio {
    margin-top: 1.2rem;
    padding: 0;
    gap: 1.3rem;
  }

  .hero-legal,
  .panel {
    padding: 2rem 1.5rem;
  }

  .band-inner {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  .panel-indicadores {
    padding-top: 1.35rem;
    padding-bottom: 1.35rem;
  }

  .indicadores-grid {
    grid-template-columns: 1fr;
  }

  .areas-lista {
    columns: 1;
  }

  .bitacora-panel {
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .hero-actions,
  .contacto-actions {
    flex-direction: column;
  }

  .btn-cta {
    width: 100%;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
</style>