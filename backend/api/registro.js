import express from 'express';
import {crearCuenta} from '../use_cases/crearCuenta.js';
import { obtenerTodos } from '../repositories/usuarioRepositorio.js';
import { asignarRol } from '../use_cases/asignarRol.js';

export const registroRoutes = express.Router();

registroRoutes.post('/crearCuenta', async (req, res) => {
  try {
    const { identificacion, nombre, correo, contrasena, rol } = req.body;
    const usuario = await crearCuenta({ identificacion, nombre, correo, contrasena, rol });
    res.status(201).json(usuario);
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    res.status(500).json({ error: 'No se pudo crear la cuenta' });
  }
});
registroRoutes.get('/listasTodas', async (req, res) => {
  try {
    const listas = await obtenerTodos();
    res.json(listas);
  } catch (error) {
    console.error('Error al obtener listas:', error);
    res.status(500).json({ error: 'No se pudieron obtener las listas' });
  }
});

registroRoutes.put('/asignarRol', async (req, res) => {
  try {
    const { nuevoRol, correo } = req.body;
    await asignarRol(nuevoRol, correo);
    res.json({ mensaje: 'Rol cambiado' });
  } catch (error) {
    console.error('Error al cambiar el rol:', error);
    res.status(500).json({ error: 'No se pudo cambiar el rol' });
  }
});
