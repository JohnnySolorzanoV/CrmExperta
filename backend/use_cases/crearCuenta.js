import {Usuario} from '../entities/usuario.js';
import * as usuarioRepositorio from '../repositories/usuarioRepositorio.js';

export async function crearCuenta({ identificacion, nombre, correo, contrasena, rol }) {
  // TODO: validar formato de identificacion
  // TODO: verificar que el correo no exista ya
  
  const usuario = new Usuario({
    identificacion,
    nombre,
    correo,
    contrasena,  // se guarda directo por ahora
    rol
  });
  
  return usuarioRepositorio.crear(usuario);
}