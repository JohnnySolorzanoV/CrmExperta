<script setup>

</script>

<template>
  <div class="container mt-4">
    <div class="row">
      <div class="col-md-8">
        <h2 class="mb-4">Mi Panel de Abogado</h2>
        
        <!-- Próximas Citas -->
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">📅 Próximas Citas</h5>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Fecha y Hora</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>María Díaz</td>
                    <td>2026-06-20 10:00</td>
                    <td>Divorcio</td>
                    <td><span class="badge bg-warning">Pendiente</span></td>
                  </tr>
                  <tr>
                    <td>Jorge Rivas</td>
                    <td>2026-06-22 14:30</td>
                    <td>Accidente de tránsito</td>
                    <td><span class="badge bg-warning">Pendiente</span></td>
                  </tr>
                  <tr>
                    <td>Carlos López</td>
                    <td>2026-06-25 09:00</td>
                    <td>Consultoría laboral</td>
                    <td><span class="badge bg-success">Confirmada</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Calendario -->
        <div class="card mb-4">
          <div class="card-header bg-info text-white">
            <h5 class="mb-0">📆 Mi Calendario</h5>
          </div>
          <div class="card-body">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Descripción</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026-06-20</td>
                  <td>10:00 - 11:00</td>
                  <td>Cita con María Díaz</td>
                  <td><span class="badge bg-primary">Cita</span></td>
                </tr>
                <tr>
                  <td>2026-06-21</td>
                  <td>15:00 - 16:30</td>
                  <td>Revisión de documentos - Caso divorcio</td>
                  <td><span class="badge bg-secondary">Trabajo administrativo</span></td>
                </tr>
                <tr>
                  <td>2026-06-22</td>
                  <td>14:30 - 15:30</td>
                  <td>Cita con Jorge Rivas</td>
                  <td><span class="badge bg-primary">Cita</span></td>
                </tr>
                <tr>
                  <td>2026-06-25</td>
                  <td>09:00 - 10:00</td>
                  <td>Cita con Carlos López</td>
                  <td><span class="badge bg-primary">Cita</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Documentación -->
      <div class="col-md-4">
        <div class="card">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">📄 Documentación</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <h6>Casos Activos</h6>
              <ul class="list-group">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Divorcio - María Díaz
                  <button class="btn btn-sm btn-outline-primary">Ver</button>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Accidente de tránsito - Jorge Rivas
                  <button class="btn btn-sm btn-outline-primary">Ver</button>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Consultoría laboral - Carlos López
                  <button class="btn btn-sm btn-outline-primary">Ver</button>
                </li>
              </ul>
            </div>
            <hr>
            <div>
              <h6>Documentos Recientes</h6>
              <ul class="list-unstyled">
                <li class="mb-2">📎 <a href="#" class="text-decoration-none">Contrato.pdf</a></li>
                <li class="mb-2">📎 <a href="#" class="text-decoration-none">Demanda.docx</a></li>
                <li class="mb-2">📎 <a href="#" class="text-decoration-none">Sentencia.pdf</a></li>
              </ul>
              <RouterLink to="/documentos" class="btn btn-sm btn-primary w-100 mt-2">Ir a Documentos</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
