import userMod from './usuario.js'

export class Cliente extends userMod.Usuario {
  constructor(x) {
    super(x)
    this.direccion = x.direccion
    this.telefono = x.telefono
  }
}
