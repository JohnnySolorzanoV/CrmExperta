// entidad para citas entre clientes y abogados
export class Cita {
  constructor({ id, idCliente, idAbogado, fecha, hora, motivo, estado }) {
    this.id = id;
    this.idCliente = idCliente;
    this.idAbogado = idAbogado;
    this.fecha = fecha;
    this.hora = hora;
    this.motivo = motivo || '';
    this.estado = estado || 'pendiente';
  }
}