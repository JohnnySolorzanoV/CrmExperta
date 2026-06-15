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
                <label for="caso" class="form-label">Selecciona un Caso</label>
                <select class="form-control" id="caso">
                  <option>-- Selecciona un caso --</option>
                  <option>Divorcio - María Díaz</option>
                  <option>Accidente de tránsito - Jorge Rivas</option>
                  <option>Consultoría laboral - Carlos López</option>
                  <option>Revisión de contrato - Ana Martínez</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="tipo-documento" class="form-label">Tipo de Documento</label>
                <select class="form-control" id="tipo-documento">
                  <option>-- Selecciona un tipo --</option>
                  <option>Contrato</option>
                  <option>Demanda</option>
                  <option>Sentencia</option>
                  <option>Acta</option>
                  <option>Prueba</option>
                  <option>Otro</option>
                </select>
              </div>
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
              <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="mb-1">📎 Demanda.docx</h6>
                    <p class="mb-1 text-muted"><small>Caso: Divorcio - María Díaz</small></p>
                    <p class="mb-1 text-muted"><small>Tipo: Demanda | Fecha: 2026-06-12</small></p>
                    <p class="mb-0"><small>Descripción: Demanda de divorcio presentada ante el juzgado</small></p>
                  </div>
                  <div>
                    <button class="btn btn-sm btn-info">Descargar</button>
                    <button class="btn btn-sm btn-danger">Eliminar</button>
                  </div>
                </div>
              </div>
              <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="mb-1">📎 Prueba_accidente.pdf</h6>
                    <p class="mb-1 text-muted"><small>Caso: Accidente de tránsito - Jorge Rivas</small></p>
                    <p class="mb-1 text-muted"><small>Tipo: Prueba | Fecha: 2026-06-15</small></p>
                    <p class="mb-0"><small>Descripción: Fotografías y reporte de peritos del accidente</small></p>
                  </div>
                  <div>
                    <button class="btn btn-sm btn-info">Descargar</button>
                    <button class="btn btn-sm btn-danger">Eliminar</button>
                  </div>
                </div>
              </div>
              <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="mb-1">📎 Sentencia.pdf</h6>
                    <p class="mb-1 text-muted"><small>Caso: Revisión de contrato - Ana Martínez</small></p>
                    <p class="mb-1 text-muted"><small>Tipo: Sentencia | Fecha: 2026-06-08</small></p>
                    <p class="mb-0"><small>Descripción: Sentencia favorable del juzgado laboral</small></p>
                  </div>
                  <div>
                    <button class="btn btn-sm btn-info">Descargar</button>
                    <button class="btn btn-sm btn-danger">Eliminar</button>
                  </div>
                </div>
              </div>
              <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="mb-1">📎 Acta_reunión.docx</h6>
                    <p class="mb-1 text-muted"><small>Caso: Consultoría laboral - Carlos López</small></p>
                    <p class="mb-1 text-muted"><small>Tipo: Acta | Fecha: 2026-06-16</small></p>
                    <p class="mb-0"><small>Descripción: Acta de reunión con el cliente y empleador</small></p>
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
