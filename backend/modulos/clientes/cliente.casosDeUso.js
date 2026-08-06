import { default as bcryptMod } from 'bcrypt'
import { Usuario } from '../../entidades/usuario.js'
import * as clienteRepo from './cliente.repositorio.js'

export async function registrarCliente({ identificacion, nombre, correo, contrasena, direccion, telefono }, cnn = null) {
  var ya_existe_mail = await clienteRepo.buscarPorCorreo(correo)
  if (ya_existe_mail) throw Object.assign(new Error('El correo ya esta registrado'), { status: 400 })

  var existe_ident = await clienteRepo.buscarPorIdentificacion(identificacion)
  if (existe_ident) throw Object.assign(new Error('La identificacion ya esta registrada'), { status: 400 })

  var contraHash = await bcryptMod.hash(contrasena, 10)
  var usr = new Usuario({ identificacion, nombre, correo, contrasena: contraHash })

  // Alta transaccional Usuario + Cliente (RF01); usa `cnn` si viene de la ruta.
  return clienteRepo.crearUsuarioConCliente(usr, direccion, telefono, cnn)
}

function sinContrasena(datos) {
  if (!datos) return null
  var { contrasena, ...limpio } = datos
  return limpio
}

export var listarClientes = async () => (await clienteRepo.obtenerClientes()).map(sinContrasena)

export async function obtenerCliente(idUsuario) {
  var c = await clienteRepo.obtenerClientePorUsuarioId(idUsuario)
  if (!c) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  return sinContrasena(c)
}

export async function actualizarCliente(idUsuario, datos, cnn = null) {
  var actualizado = await clienteRepo.actualizarDatosCliente(idUsuario, datos, cnn)
  if (!actualizado) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  return sinContrasena(actualizado)
}

export async function cambiarEstadoCliente(idUsuario, activo) {
  var ok = await clienteRepo.cambiarEstadoCliente(idUsuario, activo)
  if (!ok) throw Object.assign(new Error('Cliente no encontrado'), { status: 404 })
  return obtenerCliente(idUsuario)
}
