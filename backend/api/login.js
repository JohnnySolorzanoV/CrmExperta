import express from 'express';
import {login} from '../use_cases/login.js';

export const loginRoutes = express.Router();

loginRoutes.post('/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    const usuario = await login({ correo, contrasena });
    res.json({ mensaje: 'Login exitoso', usuario });
  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(401).json({ error: error.message });
  }
});