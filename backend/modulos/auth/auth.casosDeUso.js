import { default as bcryptMod } from 'bcrypt'
import jwt from 'jsonwebtoken'
import * as authRepo from './auth.repositorio.js'
import { Usuario } from '../../entidades/usuario.js'

var claveJWT = process.env.JWT_SECRET || 'crm-experta-secreto-temporal'

export var registrarse = async ({ identificacion, nombre, correo, contrasena }) => {
  console.log('registrando:', correo)
  var ya_existe_mail = await authRepo.buscarPorCorreo(correo)
  if (ya_existe_mail) throw Object.assign(new Error('El correo ya esta registrado'), { status: 400 })

  var existeident = await authRepo.buscarPorIdentificacion(identificacion)
  if (existeident) throw Object.assign(new Error('La identificacion ya esta registrada'), { status: 400 })

  var contraHash = await bcryptMod.hash(contrasena, 10)
  var usr = new Usuario({ identificacion, nombre, correo, contrasena: contraHash })

  var RES = await authRepo.crear(usr)
  await authRepo.crearCliente(RES.id)

  console.log('user creado:', RES.id)
  return RES
}

export async function iniciarSesion({ correo, contrasena }) {
  var userr = await authRepo.buscarPorCorreo(correo)
  if (!userr) {
    throw Object.assign(new Error('Correo o contraseña incorrectos'), { status: 401 })
  }

  var PASS_val = await bcryptMod.compare(contrasena, userr.contrasena)
  if (!PASS_val) throw Object.assign(new Error('Correo o contraseña incorrectos'), { status: 401 })

  var ROLES_DEL_USER = await authRepo.detectarRoles(userr.id)
  console.log('roles:', ROLES_DEL_USER)

  var TOKEN = jwt.sign(
    { id: userr.id, correo: userr.correo, roles: ROLES_DEL_USER },
    claveJWT,
    { expiresIn: '8h' }
  )

  return {
    token: TOKEN,
    usuario: {
      id: userr.id,
      identificacion: userr.identificacion,
      nombre: userr.nombre,
      correo: userr.correo,
      roles: ROLES_DEL_USER
    }
  }
}

export async function recuperarContrasena(correo) {
  var validacionExiste = await authRepo.buscarPorCorreo(correo)
  if (!validacionExiste) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })
  return { mensaje: 'Si existe, contacta al admin' }
}
