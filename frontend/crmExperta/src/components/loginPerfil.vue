<script setup>

</script>

<template>
  <div class="container mt-5 text-center">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card p-5">
          <h2 class="mb-4">Iniciar Sesión</h2>
          <form>
            <div class="mb-3">
              <label for="email" class="form-label">Correo Electrónico</label>
              <input type="email" class="form-control" id="email" placeholder="tu@correo.com" required>
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <input type="password" class="form-control" id="password" placeholder="Contraseña" required>
            </div>
            <button type="submit" class="btn btn-primary w-100">Ingresar</button>
          </form>
          <div class="mt-3">
            <RouterLink to="/recuperarContrasena" class="text-decoration-none">¿Olvidaste tu contraseña?</RouterLink>
          </div>
          <div class="mt-2">
            <RouterLink to="/inicioCRM" class="btn btn-secondary w-100">Volver</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>