import { Usuario } from './usuario.js';

export class Cliente extends Usuario {
  constructor({ id, identificacion, nombre, correo, contrasena, direccion, telefono }) {
    super({ id, identificacion, nombre, correo, contrasena, rol: 'cliente' });
    this.direccion = direccion;
    this.telefono = telefono;
  }
}