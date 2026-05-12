import Cita from '../entities/cita.js';
import * as citaRepositorio from '../repositories/citaRepositorio.js';

async function agendarCita({ idCliente, idAbogado, fecha, hora, motivo }) {
  if (!idCliente || !idAbogado || !fecha) {
    throw new Error('Faltan datos requeridos para la cita');
  }
  
  const cita = new Cita({
    idCliente,
    idAbogado,
    fecha,
    hora,
    motivo,
    estado: 'pendiente'
  });
  
  return citaRepositorio.crear(cita);
}

export default agendarCita;
