import * as abogadoRepositorio from '../repositories/abogadoRepositorio.js';

export async function crearAbogado({ identificacion, nombre, correo, contrasena, especialidad, numLicencia }) {
  // falta validar que no exista ya un abogado con esa cedula
  return abogadoRepositorio.crear({
    identificacion,
    nombre,
    correo,
    contrasena,
    especialidad,
    numLicencia
  });
}