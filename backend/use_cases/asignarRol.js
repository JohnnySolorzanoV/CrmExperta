import { Usuario } from "../entities/usuario.js";
import * as usuarioRepositorio from "../repositories/usuarioRepositorio.js";

export async function asignarRol (nuevoRol, correo) {
    const usuarioActualizar = await usuarioRepositorio.buscarPorCorreo(correo);
    if (usuarioActualizar === null) {
        throw new Error("Usuario no encontrado");
    }else {
        usuarioActualizar.rol = nuevoRol;
        await usuarioRepositorio.actualizar(usuarioActualizar);
    }
}