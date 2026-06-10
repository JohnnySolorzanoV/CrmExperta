export class Documento {
  constructor(doc) {
    this.id = doc.id
    this.idCaso = doc.idCaso
    this.nombreDocumento = doc.nombreDocumento
    this.descripcion = doc.descripcion
    this.extension = doc.extension
    this.fechaSubida = doc.fechaSubida
    this.rutaArchivo = doc.rutaArchivo
    this.tamaño = doc.tamaño
  }
}
