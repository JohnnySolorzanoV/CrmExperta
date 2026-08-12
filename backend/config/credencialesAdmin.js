// Credenciales del administrador para el seed.
// - En desarrollo (NODE_ENV=development) se permiten valores por defecto para
//   facilitar el arranque local.
// - En cualquier otro entorno (produccion, staging, etc.) son OBLIGATORIAS via
//   ADMIN_CORREO y ADMIN_CONTRASENA. Si faltan, se lanza un error y el proceso
//   se detiene; nunca se usa una clave por defecto fuera de desarrollo.
export const CORREO_ADMIN_PREDETERMINADO = 'admin@crm.com'
export const PASS_ADMIN_PREDETERMINADO = 'admin123'

export function obtenerCredencialesAdmin({
  env = process.env,
  nodeEnv = process.env.NODE_ENV || 'development',
} = {}) {
  var esDesarrollo = nodeEnv === 'development'

  var correo = env.ADMIN_CORREO
  var contrasena = env.ADMIN_CONTRASENA

  if (esDesarrollo) {
    if (!correo) correo = CORREO_ADMIN_PREDETERMINADO
    if (!contrasena) contrasena = PASS_ADMIN_PREDETERMINADO
  }

  if (!esDesarrollo && (!correo || !contrasena)) {
    throw new Error(
      'Credenciales de administrador obligatorias en ' + nodeEnv +
      ': define ADMIN_CORREO y ADMIN_CONTRASENA. No se usan valores por defecto.'
    )
  }

  return { correo, contrasena, esDesarrollo }
}
