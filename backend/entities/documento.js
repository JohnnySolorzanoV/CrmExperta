export class Documento {
  constructor({ idDocumento, nombreArchivo, rutaArchivo, tipoDocumento, fechaSubida, cedulaUsuario }) {
    this.idDocumento = idDocumento;
    this.nombreArchivo = nombreArchivo;
    this.rutaArchivo = rutaArchivo;
    this.tipoDocumento = tipoDocumento;
    this.fechaSubida = fechaSubida;
    this.cedulaUsuario = cedulaUsuario;
  }
}