<script setup>

</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-4">Gestión de Citas</h2>
    
    <!-- Filtros -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row">
          <div class="col-md-4">
            <label for="filtro-estado" class="form-label">Filtrar por estado</label>
            <select class="form-control" id="filtro-estado">
              <option>Todas</option>
              <option>Pendiente</option>
              <option>Confirmada</option>
              <option>En Proceso</option>
              <option>Concluida</option>
              <option>Cancelada</option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="filtro-abogado" class="form-label">Filtrar por abogado</label>
            <select class="form-control" id="filtro-abogado">
              <option>Todos</option>
              <option>Ana Pérez</option>
              <option>Luis Gómez</option>
              <option>María López</option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="filtro-fecha" class="form-label">Filtrar por fecha</label>
            <input type="date" class="form-control" id="filtro-fecha">
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de Citas -->
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead class="table-dark">
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Abogado</th>
            <th>Fecha y Hora</th>
            <th>Motivo</th>
            <th>Estado Actual</th>
            <th>Cambiar Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>#001</td>
            <td>María Díaz</td>
            <td>Ana Pérez</td>
            <td>2026-06-20 10:00</td>
            <td>Divorcio</td>
            <td><span class="badge bg-warning">Pendiente</span></td>
            <td>
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-info" title="Cambiar a En Proceso">En Proceso</button>
                <button class="btn btn-outline-success" title="Cambiar a Concluida">Concluida</button>
              </div>
            </td>
            <td>
              <button class="btn btn-sm btn-primary">Ver</button>
              <button class="btn btn-sm btn-danger">Cancelar</button>
            </td>
          </tr>
          <tr>
            <td>#002</td>
            <td>Jorge Rivas</td>
            <td>Luis Gómez</td>
            <td>2026-06-22 14:30</td>
            <td>Accidente de tránsito</td>
            <td><span class="badge bg-success">Confirmada</span></td>
            <td>
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-info" title="Cambiar a En Proceso">En Proceso</button>
                <button class="btn btn-outline-success" title="Cambiar a Concluida">Concluida</button>
              </div>
            </td>
            <td>
              <button class="btn btn-sm btn-primary">Ver</button>
              <button class="btn btn-sm btn-danger">Cancelar</button>
            </td>
          </tr>
          <tr>
            <td>#003</td>
            <td>Carlos López</td>
            <td>María López</td>
            <td>2026-06-25 09:00</td>
            <td>Consultoría laboral</td>
            <td><span class="badge bg-info">En Proceso</span></td>
            <td>
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-success" title="Cambiar a Concluida">Concluida</button>
              </div>
            </td>
            <td>
              <button class="btn btn-sm btn-primary">Ver</button>
              <button class="btn btn-sm btn-danger">Cancelar</button>
            </td>
          </tr>
          <tr>
            <td>#004</td>
            <td>Ana Martínez</td>
            <td>Ana Pérez</td>
            <td>2026-06-18 16:00</td>
            <td>Revisión de contrato</td>
            <td><span class="badge bg-success">Concluida</span></td>
            <td>
              <span class="text-muted">Finalizada</span>
            </td>
            <td>
              <button class="btn btn-sm btn-primary">Ver</button>
            </td>
          </tr>
          <tr>
            <td>#005</td>
            <td>Roberto García</td>
            <td>Luis Gómez</td>
            <td>2026-06-15 13:30</td>
            <td>Negociación laboral</td>
            <td><span class="badge bg-danger">Cancelada</span></td>
            <td>
              <span class="text-muted">Cancelada</span>
            </td>
            <td>
              <button class="btn btn-sm btn-primary">Ver</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
                <label for="fecha-cita" class="form-label">Fecha y Hora</label>
                <input type="datetime-local" class="form-control" id="fecha-cita">
              </div>
            </div>
            <div class="col-md-6">
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
  </div>
</template>
