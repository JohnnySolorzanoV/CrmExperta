import { default as bcryptMod } from 'bcrypt'
import { Usuario } from '../../entidades/usuario.js'
import * as clienteRepo from './cliente.repositorio.js'

export async function registrarCliente({ identificacion, nombre, correo, contrasena, direccion, telefono }) {
  var ya_existe_mail = await clienteRepo.buscarPorCorreo(correo)
  if (ya_existe_mail) throw Object.assign(new Error('El correo ya esta registrado'), { status: 400 })

  var existe_ident = await clienteRepo.buscarPorIdentificacion(identificacion)
  if (existe_ident) throw Object.assign(new Error('La identificacion ya esta registrada'), { status: 400 })

  var contraHash = await bcryptMod.hash(contrasena, 10)
  var usr = new Usuario({ identificacion, nombre, correo, contrasena: contraHash })

  var usuarioCreado = await clienteRepo.crearUsuario(usr)
  await clienteRepo.crearCliente(usuarioCreado.id, direccion, telefono)

  return usuarioCreado
}
