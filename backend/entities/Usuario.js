export class Usuario {
  constructor({ id, identificacion, cedula, nombre, correo, contrasena, rol }) {
    this.id = id;
    this.identificacion = identificacion || cedula;
    this.cedula = this.identificacion;
    this.nombre = nombre;
    this.correo = correo;
    this.contrasena = contrasena;
    this.rol = rol;
  }
}