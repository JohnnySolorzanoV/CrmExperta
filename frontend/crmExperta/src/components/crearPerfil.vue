<script setup>

</script>

<template>
  <div class="container mt-4">
    <div class="row">
      <div class="col-md-8">
        <h2 class="mb-4">Agendar Cita</h2>
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Datos de la Cita</h5>
          </div>
          <div class="card-body">
            <form>
              <div class="mb-3">
                <label for="nombres" class="form-label">Nombres</label>
                <input type="text" class="form-control" id="nombres" placeholder="Tu nombre">
              </div>
              <div class="mb-3">
                <label for="apellidos" class="form-label">Apellidos</label>
                <input type="text" class="form-control" id="apellidos" placeholder="Tu apellido">
              </div>
              <div class="mb-3">
                <label for="identificacion" class="form-label">Número de Identificación</label>
                <input type="text" class="form-control" id="identificacion" placeholder="Tu cédula o documento">
              </div>
              <div class="mb-3">
                <label for="correo" class="form-label">Correo Electrónico</label>
                <input type="email" class="form-control" id="correo" placeholder="tu@correo.com">
              </div>
              <div class="mb-3">
                <label for="telefono" class="form-label">Teléfono</label>
                <input type="tel" class="form-control" id="telefono" placeholder="+57 1 1234567">
              </div>
              <div class="mb-3">
                <label for="abogado" class="form-label">Selecciona un Abogado</label>
                <select class="form-control" id="abogado">
                  <option>-- Selecciona un abogado --</option>
                  <option>Ana Pérez - Derecho Civil</option>
                  <option>Luis Gómez - Derecho Laboral</option>
                  <option>María López - Derecho Mercantil</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="fecha" class="form-label">Fecha y Hora</label>
                <input type="datetime-local" class="form-control" id="fecha">
              </div>
              <div class="mb-3">
                <label for="motivo" class="form-label">Motivo de la Consulta</label>
                <textarea class="form-control" id="motivo" rows="4" placeholder="Describe el motivo de tu consulta..."></textarea>
              </div>
              <button type="submit" class="btn btn-success">Agendar Cita</button>
            </form>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <h5 class="mb-3">Abogados Disponibles</h5>
        <div class="card mb-3">
          <div class="card-body">
            <h6 class="card-title">Ana Pérez</h6>
            <p class="card-text text-muted"><strong>Especialidad:</strong> Derecho Civil</p>
            <p class="card-text text-muted"><strong>Correo:</strong> ana.perez@experta.com</p>
            <button class="btn btn-sm btn-primary">Seleccionar</button>
          </div>
        </div>
        <div class="card mb-3">
          <div class="card-body">
            <h6 class="card-title">Luis Gómez</h6>
            <p class="card-text text-muted"><strong>Especialidad:</strong> Derecho Laboral</p>
            <p class="card-text text-muted"><strong>Correo:</strong> luis.gomez@experta.com</p>
            <button class="btn btn-sm btn-primary">Seleccionar</button>
          </div>
        </div>
        <div class="card mb-3">
          <div class="card-body">
            <h6 class="card-title">María López</h6>
            <p class="card-text text-muted"><strong>Especialidad:</strong> Derecho Mercantil</p>
            <p class="card-text text-muted"><strong>Correo:</strong> maria.lopez@experta.com</p>
            <button class="btn btn-sm btn-primary">Seleccionar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>