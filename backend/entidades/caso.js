export class Caso {
  constructor(x) {
    this.id = x.id
    this.estadoCaso = x.estadoCaso
    this.fechaApertura = x.fechaApertura
    this.tipoCaso = x.tipoCaso
    this.nombreCaso = x.nombreCaso
    this.notas = x.notas || ''
    this.conclusiones = x.conclusiones || ''
    this.idCliente = x.idCliente
    this.idAbogado = x.idAbogado
    this.clienteNombre = x.clienteNombre || ''
    this.abogadoNombre = x.abogadoNombre || ''
  }
}
