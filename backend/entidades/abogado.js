import { Usuario as BaseUser } from './usuario.js'

export class Abogado extends BaseUser {
  constructor(x) {
    super(x)
    this.especialidad = x.especialidad
    this.numLicencia = x.numLicencia
  }
}
