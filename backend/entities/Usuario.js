export class Usuario {
  constructor({ id, identificacion, nombre, correo, contrasena, rol }) {
    this.id = id;
    this.identificacion = identificacion;
    this.nombre = nombre;
    this.correo = correo;
    this.contrasena = contrasena;
    this.rol = rol;
  }
}