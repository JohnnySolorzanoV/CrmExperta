<script setup>

</script>

<template>
  <div class="container mt-4">
    <div class="row">
      <div class="col-12 text-center mb-4">
        <h2>Bienvenido, Abogado</h2>
        <p class="text-muted">Revisa tu calendario, citas pendientes, documentación y casos.</p>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Calendario</h5>
          </div>
          <div class="card-body">
            <p class="text-muted">Revisa tu agenda y próximas fechas de atención.</p>
            <ul class="list-group">
              <li class="list-group-item d-flex justify-content-between align-items-center">
                2026-06-20
                <span class="badge bg-primary">10:00</span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                2026-06-22
                <span class="badge bg-primary">14:30</span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                2026-06-25
                <span class="badge bg-primary">09:30</span>
              </li>
            </ul>
            <RouterLink to="/abogados" class="btn btn-outline-primary mt-3">Ver Calendario Completo</RouterLink>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header bg-warning text-dark">
            <h5 class="mb-0">Citas Pendientes</h5>
          </div>
          <div class="card-body">
            <p class="text-muted">Gestiona tus citas y mantente al día con tus clientes.</p>
            <ul class="list-group">
              <li class="list-group-item">
                <strong>María Díaz</strong><br>
                2026-06-20 - 10:00
              </li>
              <li class="list-group-item">
                <strong>Jorge Rivas</strong><br>
                2026-06-22 - 14:30
              </li>
              <li class="list-group-item">
                <strong>Carlos López</strong><br>
                2026-06-25 - 09:30
              </li>
            </ul>
            <RouterLink to="/citas" class="btn btn-outline-warning mt-3">Ver Todas las Citas</RouterLink>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4 mt-3">
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">Documentación de Clientes</h5>
          </div>
          <div class="card-body">
            <p class="text-muted">Accede directamente a los archivos de tus casos activos.</p>
            <ul class="list-group">
              <li class="list-group-item">Contrato.pdf - María Díaz</li>
              <li class="list-group-item">Demanda.docx - Jorge Rivas</li>
              <li class="list-group-item">Acta_reunión.docx - Carlos López</li>
            </ul>
            <RouterLink to="/documentos" class="btn btn-outline-success mt-3">Revisar Documentos</RouterLink>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header bg-secondary text-white">
            <h5 class="mb-0">Casos</h5>
          </div>
          <div class="card-body">
            <p class="text-muted">Cambia el estado de los casos a finalizado cuando terminen.</p>
            <div class="list-group">
              <div class="list-group-item d-flex justify-content-between align-items-center">
                Divorcio - María Díaz
                <button class="btn btn-sm btn-outline-success">Finalizado</button>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                Accidente de tránsito - Jorge Rivas
                <button class="btn btn-sm btn-outline-success">Finalizado</button>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                Consultoría laboral - Carlos López
                <button class="btn btn-sm btn-outline-success">Finalizado</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>