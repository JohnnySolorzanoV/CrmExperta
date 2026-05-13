import {Usuario} from '../entities/usuario.js';
import * as usuarioRepositorio from '../repositories/usuarioRepositorio.js';

export async function crearCuenta({ cedula, nombre, correo, contrasena, rol }) {
  // TODO: validar formato de cedula
  // TODO: verificar que el correo no exista ya
  
  const usuario = new Usuario({
    identificacion: cedula,
    nombre,
    correo,
    contrasena,  // se guarda directo por ahora
    rol
  });
  
  return usuarioRepositorio.crear(usuario);
}