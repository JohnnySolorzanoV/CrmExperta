export class Cita {
  constructor(x) {
    this.id = x.id
    this.idCliente = x.idCliente
    this.idAbogado = x.idAbogado
    this.abogadoNombre = x.abogadoNombre || ''
    this.clienteNombre = x.clienteNombre || ''
    this.fechaHoraCopia = x.fechaHoraCopia
    this.idCalendario = x.idCalendario
    this.motivo = x.motivo || ''
    this.estadoCita = x.estadoCita || 'pendiente'
    this.resumenChatbot = x.resumenChatbot
    this.createdAt = x.createdAt
    this.googleEventId = x.googleEventId || null
    this.motivoCancelacion = x.motivoCancelacion || null
    this.canceladoPor = x.canceladoPor || null
  }
}
