export class Chatbot {
  constructor({ idConsulta, cedulaCliente, pregunta, respuesta, fecha }) {
    this.idConsulta = idConsulta;
    this.cedulaCliente = cedulaCliente;
    this.pregunta = pregunta;
    this.respuesta = respuesta;
    this.fecha = fecha;
  }
}