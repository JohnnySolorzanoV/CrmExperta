<template>
  <section class="about-page py-5">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-9">
          <div class="card shadow-sm border-0 about-card">
            <div class="card-body p-4 p-md-5">
              <h1 class="display-6 fw-bold mb-3 text-center">Sobre Nosotros</h1>
              <p class="lead text-muted text-center mb-4">
                En Experta&Abogados acompanamos a cada cliente con asesoria legal clara, cercana y profesional.
              </p>

              <div class="row g-3 mt-1">
                <div class="col-md-4">
                  <article class="info-box h-100">
                    <h2 class="h5 fw-semibold">Nuestra mision</h2>
                    <p class="mb-0">
                      Brindar soluciones juridicas oportunas para proteger los derechos de personas y familias.
                    </p>
                  </article>
                </div>

                <div class="col-md-4">
                  <article class="info-box h-100">
                    <h2 class="h5 fw-semibold">Nuestra vision</h2>
                    <p class="mb-0">
                      Ser un referente de confianza en servicios legales, combinando experiencia y atencion humana.
                    </p>
                  </article>
                </div>

                <div class="col-md-4">
                  <article class="info-box h-100">
                    <h2 class="h5 fw-semibold">Nuestros valores</h2>
                    <p class="mb-0">
                      Etica, compromiso y transparencia en cada caso, con comunicacion permanente con el cliente.
                    </p>
                  </article>
                </div>
              </div>

              <div class="text-center mt-4 pt-2">
                <RouterLink class="btn btn-primary px-4" to="/inicio">Volver al inicio</RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-page {
  min-height: 70vh;
}

.about-card {
  border-radius: 16px;
}

.info-box {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #e9ecef;
}
</style>
