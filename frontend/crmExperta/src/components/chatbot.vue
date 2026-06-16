<script setup>

</script>

<template>
  <div class="container mt-4">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <h2 class="mb-4">💬 Chatbot de Ayuda - EXPERTA&ABOGADOS</h2>
        
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Asistente Legal Virtual</h5>
          </div>
          
          <!-- Chat Messages -->
          <div class="card-body bg-light" style="min-height: 400px; max-height: 500px; overflow-y: auto;">
            <!-- Bot Message -->
            <div class="mb-3">
              <div class="d-flex">
                <div class="bg-primary text-white rounded px-3 py-2" style="max-width: 80%;">
                  <p class="mb-0"><strong>Bot:</strong> ¡Hola! Soy el asistente virtual de EXPERTA&ABOGADOS. ¿En qué puedo ayudarte hoy?</p>
                </div>
              </div>
            </div>

            <!-- User Message -->
            <div class="mb-3">
              <div class="d-flex justify-content-end">
                <div class="bg-success text-white rounded px-3 py-2" style="max-width: 80%;">
                  <p class="mb-0"><strong>Tú:</strong> ¿Cuál es el costo de una consulta?</p>
                </div>
              </div>
            </div>

            <!-- Bot Message -->
            <div class="mb-3">
              <div class="d-flex">
                <div class="bg-primary text-white rounded px-3 py-2" style="max-width: 80%;">
                  <p class="mb-0"><strong>Bot:</strong> Nuestras consultas iniciales tienen un costo de $150,000 COP. Después de la primera consulta, podemos ofrecerte un plan personalizado según tus necesidades.</p>
                </div>
              </div>
            </div>

            <!-- User Message -->
            <div class="mb-3">
              <div class="d-flex justify-content-end">
                <div class="bg-success text-white rounded px-3 py-2" style="max-width: 80%;">
                  <p class="mb-0"><strong>Tú:</strong> ¿Cómo agendo una cita?</p>
                </div>
              </div>
            </div>

            <!-- Bot Message -->
            <div class="mb-3">
              <div class="d-flex">
                <div class="bg-primary text-white rounded px-3 py-2" style="max-width: 80%;">
                  <p class="mb-0"><strong>Bot:</strong> Puedes agendar una cita de dos formas:
                  <br/>1. Usando nuestro formulario en la sección "Agendar Cita"
                  <br/>2. Llamando al +57 1 2345678
                  <br/>¿Te gustaría agendar una cita ahora?</p>
                </div>
              </div>
            </div>

            <!-- User Message -->
            <div class="mb-3">
              <div class="d-flex justify-content-end">
                <div class="bg-success text-white rounded px-3 py-2" style="max-width: 80%;">
                  <p class="mb-0"><strong>Tú:</strong> Sí, necesito consulta sobre derecho civil</p>
                </div>
              </div>
            </div>

            <!-- Bot Message -->
            <div class="mb-3">
              <div class="d-flex">
                <div class="bg-primary text-white rounded px-3 py-2" style="max-width: 80%;">
                  <p class="mb-0"><strong>Bot:</strong> Perfecto. Tenemos dos especialistas en Derecho Civil:
                  <br/>• <strong>Ana Pérez</strong> - Disponible próxima semana
                  <br/>• <strong>Luis Gómez</strong> - Disponible en 3 días
                  <br/>¿Cuál prefieres o necesitas más información?</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="card-footer">
            <form class="d-flex gap-2">
              <input type="text" class="form-control" placeholder="Escribe tu pregunta aquí...">
              <button type="submit" class="btn btn-primary">Enviar</button>
            </form>
          </div>
        </div>

        <!-- FAQ Section -->
        <div class="card mt-4">
          <div class="card-header bg-secondary text-white">
            <h5 class="mb-0">PREGUNTAS FRECUENTES</h5>
          </div>
          <div class="card-body">
            <div class="accordion" id="faqAccordion">
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                    ¿Qué tipos de servicios legales ofrecemos?
                  </button>
                </h2>
                <div id="faq1" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    Ofrecemos servicios en las siguientes áreas: defensa familiar, derecho constitucional, derecho civil, leyes de transito y derecho sucesorio.
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">
                    ¿Cuáles son los horarios de atención?
                  </button>
                </h2>
                <div id="faq2" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    Atendemos de lunes a viernes de 8:00 AM a 6:00 PM (Una solo jornada).
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">
                    ¿Realizan consultas virtuales?
                  </button>
                </h2>
                <div id="faq3" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    No, al usted registrar su cita debe acercarse a nuestras oficinas ubicadas en la calle Imbabura entre Bolivar y Fernando Valdivieso 158-14.
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq4">
                    ¿Tienen protección de datos y confidencialidad?
                  </button>
                </h2>
                <div id="faq4" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    Sí, cumplimos con todas las leyes de protección de datos y confidencialidad. Toda la información que compartes es completamente segura.
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq5">
                    ¿Cuáles son los métodos de pago?
                  </button>
                </h2>
                <div id="faq5" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body">
                    Aceptamos pagos en efectivo, transferencia bancaria, tarjeta de crédito y débito. 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="alert alert-info mt-4">
          <h5>📞 CONTACTOS</h5>
          <p class="mb-1"><strong>Teléfono:</strong>09924711991</p>
          <p class="mb-1"><strong>Correo:</strong> expertaabogados@gmail.com</p>
          <p class="mb-0"><strong>Dirección:</strong>Imbabura entre Bolivar y Fernando Valdivieso 158-14</p>
        </div>
      </div>
    </div>
  </div>
</template>
