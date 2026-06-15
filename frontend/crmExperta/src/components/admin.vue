<script setup>

</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-4">Gestión de Abogados</h2>
    <div class="mb-4">
      <button class="btn btn-success me-2">+ Agregar Abogado</button>
    </div>
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead class="table-dark">
          <tr>
            <th>Nombre</th>
            <th>Especialidad</th>
            <th>Licencia</th>
            <th>Correo</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ana Pérez</td>
            <td>Derecho Civil</td>
            <td>LIC-2024-001</td>
            <td>ana.perez@experta.com</td>
            <td>+57 1 2345678</td>
            <td>
              <button class="btn btn-sm btn-info me-2">Editar</button>
              <button class="btn btn-sm btn-danger">Eliminar</button>
            </td>
          </tr>
          <tr>
            <td>Luis Gómez</td>
            <td>Derecho Laboral</td>
            <td>LIC-2024-002</td>
            <td>luis.gomez@experta.com</td>
            <td>+57 1 9876543</td>
            <td>
              <button class="btn btn-sm btn-info me-2">Editar</button>
              <button class="btn btn-sm btn-danger">Eliminar</button>
            </td>
          </tr>
          <tr>
            <td>María López</td>
            <td>Derecho Mercantil</td>
            <td>LIC-2024-003</td>
            <td>maria.lopez@experta.com</td>
            <td>+57 1 5555555</td>
            <td>
              <button class="btn btn-sm btn-info me-2">Editar</button>
              <button class="btn btn-sm btn-danger">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="card mt-4">
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0">Agregar Nuevo Abogado</h5>
      </div>
      <div class="card-body">
        <form>
          <div class="row">
            <div class="col-md-6">
              <div class="mb-3">
                <label for="nombre" class="form-label">Nombre Completo</label>
                <input type="text" class="form-control" id="nombre" placeholder="Nombre del abogado">
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3">
                <label for="especialidad" class="form-label">Especialidad</label>
                <select class="form-control" id="especialidad">
                  <option>Derecho Civil</option>
                  <option>Derecho Laboral</option>
                  <option>Derecho Mercantil</option>
                  <option>Derecho Penal</option>
                  <option>Derecho Constitucional</option>
                </select>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <div class="mb-3">
                <label for="licencia" class="form-label">Número de Licencia</label>
                <input type="text" class="form-control" id="licencia" placeholder="LIC-XXXX-XXX">
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3">
                <label for="correo" class="form-label">Correo Electrónico</label>
                <input type="email" class="form-control" id="correo" placeholder="correo@experta.com">
              </div>
            </div>
          </div>
          <div class="mb-3">
            <label for="telefono" class="form-label">Teléfono</label>
            <input type="tel" class="form-control" id="telefono" placeholder="+57 1 1234567">
          </div>
          <button type="submit" class="btn btn-primary">Guardar Abogado</button>
        </form>
      </div>
    </div>
  </div>
</template>
