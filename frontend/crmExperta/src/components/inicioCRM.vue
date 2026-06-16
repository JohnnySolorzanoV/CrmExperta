<script setup>

</script>

<template >
  <div class="border" >
  <div class= "logoCRM container text-center mt-0 mb-5 mx-0">
    <h1 class="mb-0">EXPERTA&ABOGADOS</h1>
    <h7
    >Firma legal con especialistas en cada área jurídica</h7>
  </div>
  <div class="botonesInicio container text-center bg-light-subtle my-5  ">
    <div class="row">
        <RouterLink type="button" class="btn btn-primary" to="/loginPerfil"> Iniciar sesión </RouterLink>
        <RouterLink type="button" class="btn btn-secondary" to="/crearPerfil"> Registrarse </RouterLink>
    </div>
  </div>
  </div>
</template>

<style scoped>
.logoCRM {
  margin-top: 100px;
  margin-bottom: 0px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.btn {
  width: 150px;
  margin: 10px;
}
.row {
  display: flex;
  justify-content: center;
}
.border {
  border: 2px solid #dab656 !important;
  width: fit-content;
  margin: 0 auto;
  border-radius: 10px;
  border-width: 5px;
}
</style>