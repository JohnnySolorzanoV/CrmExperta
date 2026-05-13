import {Chatbot} from '../entities/chatbot.js';
import { ejecutarSQL } from '../external_integrations/baseDatos.js';

// este repo esta mas simple porque todavia no implementamos bien el chatbot

export async function buscarPorId(idConsulta) {
  const resultado = await ejecutarSQL(
    'SELECT * FROM Chatbot WHERE idConsulta = $1',
    [idConsulta]
  );
  return resultado.rows[0] ? new Chatbot(resultado.rows[0]) : null;
}

export async function obtenerTodos() {
  const resultado = await ejecutarSQL('SELECT * FROM Chatbot ORDER BY fecha DESC');
  return resultado.rows.map(row => new Chatbot(row));
}

export async function crear(consulta) {
  const resultado = await ejecutarSQL(
    'INSERT INTO Chatbot (cedula_cliente, preguntaUsuarios, respuestaIA) VALUES ($1, $2, $3) RETURNING *',
    [consulta.cedulaCliente, consulta.pregunta, consulta.respuesta]
  );
  return new Chatbot(resultado.rows[0]);
}

export async function eliminarPorId(idConsulta) {
  await ejecutarSQL('DELETE FROM Chatbot WHERE idConsulta = $1', [idConsulta]);
}

export default {
  buscarPorId,
  obtenerTodos,
  crear,
  eliminarPorId
};
