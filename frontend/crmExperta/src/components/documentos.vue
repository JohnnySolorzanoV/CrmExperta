<script setup>

</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-4">Gestión de Documentos</h2>

    <div class="row">
      <!-- Formulario de Subida -->
      <div class="col-md-5">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">📤 Subir Documento</h5>
          </div>
          <div class="card-body">
            <form>
              <div class="mb-3">
                <label for="archivo" class="form-label">Selecciona el Archivo</label>
                <input type="file" class="form-control" id="archivo">
              </div>
              <div class="mb-3">
                <label for="descripcion" class="form-label">Descripción</label>
                <textarea class="form-control" id="descripcion" rows="3" placeholder="Descripción o notas del documento..."></textarea>
              </div>
              <button type="submit" class="btn btn-success w-100">Subir Documento</button>
            </form>
          </div>
        </div>
      </div>

      <!-- Lista de Documentos -->
      <div class="col-md-7">
        <div class="card">
          <div class="card-header bg-info text-white">
            <h5 class="mb-0">📄 Documentos Subidos</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <input type="text" class="form-control" placeholder="Buscar documentos...">
            </div>
            <div class="list-group">
              <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="mb-1">📎 Contrato.pdf</h6>
                    <p class="mb-1 text-muted"><small>Caso: Divorcio - María Díaz</small></p>
                    <p class="mb-1 text-muted"><small>Tipo: Contrato | Fecha: 2026-06-10</small></p>
                    <p class="mb-0"><small>Descripción: Contrato matrimonial original</small></p>
                  </div>
                  <div>
                    <button class="btn btn-sm btn-info">Descargar</button>
                    <button class="btn btn-sm btn-danger">Eliminar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
