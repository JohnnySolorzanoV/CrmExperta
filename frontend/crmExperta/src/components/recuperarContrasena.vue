<script setup>

</script>

<template>
  <div class="container mt-5 text-center">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card p-5">
          <h2 class="mb-4">Recuperar Contraseña</h2>
          <p class="text-muted mb-4">Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu contraseña.</p>
          <form>
            <div class="mb-3">
              <label for="email" class="form-label">Correo Electrónico</label>
              <input type="email" class="form-control" id="email" placeholder="tu@correo.com" required>
            </div>
            <button type="submit" class="btn btn-primary w-100">Enviar Instrucciones</button>
          </form>
          <div class="mt-3">
            <RouterLink to="/loginPerfil" class="btn btn-secondary w-100">Volver a Iniciar Sesión</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>