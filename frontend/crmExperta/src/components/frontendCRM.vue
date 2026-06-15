<script setup>

</script>

<template>
  <div class="container mt-5">
    <div class="row text-center">
      <div class="col-12">
        <h1 class="mb-3">EXPERTA&ABOGADOS</h1>
        <p class="lead text-muted">Firma legal con especialistas en cada área jurídica</p>
      </div>
    </div>
    <div class="row mt-5">
      <div class="col-md-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">📋 Agendar Cita</h5>
            <p class="card-text">Selecciona un abogado y agenda tu consulta en línea de forma rápida y segura.</p>
            <RouterLink to="/crearPerfil" class="btn btn-primary">Agendar Cita</RouterLink>
          </div>
        </div>
      </div>
      <div class="col-md-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">👨‍⚖️ Panel de Abogado</h5>
            <p class="card-text">Accede a tu panel de control para ver citas, calendario y documentación.</p>
            <RouterLink to="/abogados" class="btn btn-primary">Mi Panel</RouterLink>
          </div>
        </div>
      </div>
      <div class="col-md-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">📁 Mis Documentos</h5>
            <p class="card-text">Sube y gestiona documentación importante relacionada con tus casos.</p>
            <RouterLink to="/documentos" class="btn btn-primary">Ir a Documentos</RouterLink>
          </div>
        </div>
      </div>
      <div class="col-md-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">💬 Chatbot de Ayuda</h5>
            <p class="card-text">Obtén respuestas rápidas a preguntas frecuentes sobre servicios legales.</p>
            <RouterLink to="/chatbot" class="btn btn-primary">Abrir Chat</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
