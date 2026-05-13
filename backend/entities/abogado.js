import { Usuario } from './usuario.js';

export class Abogado extends Usuario {
  constructor({ id, identificacion, nombre, correo, contrasena, especialidad, numLicencia }) {
    super({ id, identificacion, nombre, correo, contrasena, rol: 'abogado' });
    this.especialidad = especialidad;
    this.numLicencia = numLicencia;
  }
}