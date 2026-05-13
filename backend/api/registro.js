import express from 'express';
import {crearCuenta} from '../use_cases/crearCuenta.js';

export const registroRoutes = express.Router();

registroRoutes.post('/crearCuenta', async (req, res) => {
  try {
    const { cedula, nombre, correo, contrasena, rol } = req.body;
    const usuario = await crearCuenta({ cedula, nombre, correo, contrasena, rol });
    res.status(201).json(usuario);
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    res.status(500).json({ error: 'No se pudo crear la cuenta' });
  }
});