import * as usuarioRepositorio from '../repositories/usuarioRepositorio.js';

// TODO: implementar JWT más adelante

export async function login({ correo, contrasena }) {
  const usuario = await usuarioRepositorio.buscarPorCorreo(correo);
  
  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }
  
  // comparacion directa por ahora
  // TODO: hashear contraseñas en el futuro
  if (contrasena !== usuario.contrasena) {
    throw new Error('Contraseña incorrecta');
  }
  
  return usuario;
}

