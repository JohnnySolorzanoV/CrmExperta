<script setup>

</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-4">Agendar nueva cita</h2>

    <!-- Formulario Nueva Cita -->
    <div class="card mt-4">
      <div class="card-header bg-success text-white">
        <h5 class="mb-0">+ Nueva Cita</h5>
      </div>
      <div class="card-body">
        <form>
          <div class="row">
            <div class="col-md-6">
              <div class="mb-3">
                <label for="cliente" class="form-label">Cliente</label>
                <input type="text" class="form-control" id="cliente" placeholder="Nombre del cliente">
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3">
                <label for="abogado" class="form-label">Abogado Asignado</label>
                <select class="form-control" id="abogado">
                  <option>-- Selecciona un abogado --</option>
                  <option>Ana Pérez</option>
                  <option>Luis Gómez</option>
                  <option>María López</option>
                </select>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <div class="mb-3">
                <label for="fecha-cita" class="form-label">Fecha</label>
                <input type="date" class="form-control" id="fecha-cita">
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3">
                <label for="hora-cita" class="form-label">Hora</label>
                <select class="form-control" id="hora-cita">
                  <option>-- Selecciona una hora --</option>
                  <option>08:00</option>
                  <option>09:00</option>
                  <option>10:00</option>
                  <option>11:00</option>
                  <option>12:00</option>
                  <option>13:00</option>
                  <option>14:30</option>
                  <option>15:30</option>
                  <option>16:30</option>
                  <option>17:30</option>
                </select>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-12">
              <div class="mb-3">
                <label for="motivo-cita" class="form-label">Motivo</label>
                <input type="text" class="form-control" id="motivo-cita" placeholder="Motivo de la cita">
              </div>
            </div>
          </div>
          <button type="submit" class="btn btn-success">Crear Cita</button>
        </form>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header bg-warning text-dark">
        <h5 class="mb-0">Citas Pendientes</h5>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Abogado</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#001</td>
                <td>María Díaz</td>
                <td>Ana Pérez</td>
                <td>2026-06-20</td>
                <td>10:00</td>
                <td>Divorcio</td>
                <td><span class="badge bg-warning text-dark">Pendiente</span></td>
              </tr>
              <tr>
                <td>#002</td>
                <td>Jorge Rivas</td>
                <td>Luis Gómez</td>
                <td>2026-06-22</td>
                <td>14:30</td>
                <td>Accidente de tránsito</td>
                <td><span class="badge bg-warning text-dark">Pendiente</span></td>
              </tr>
              <tr>
                <td>#003</td>
                <td>Carlos López</td>
                <td>María López</td>
                <td>2026-06-25</td>
                <td>09:30</td>
                <td>Consultoría laboral</td>
                <td><span class="badge bg-warning text-dark">Pendiente</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
