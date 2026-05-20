import { Usuario } from "../entities/usuario";
import * as usuarioRepositorio from "../repositories/usuarioRepositorio.js";

export async function recuperarContrasena (correo) {
    const usuario = await usuarioRepositorio.buscarPorCorreo(correo);
    if (usuario === null) {
        throw new Error("Usuario no encontrado");
    }
    else {
        // Enviar contraseña por correo despues
        // generar nueva contraseña para guradar en el usuario
        // si se puede mandar la contrsasena por correo mandar un true sino false
        return true;
    }
}