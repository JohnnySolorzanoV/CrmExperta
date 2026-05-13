import express from 'express';
import {crearAbogado} from '../use_cases/crearAbogado.js';
import * as abogadoRepositorio from '../repositories/abogadoRepositorio.js';

export const abogadoRoutes = express.Router();

abogadoRoutes.get('/abogados', async (req, res) => {
  try {
    const abogados = await abogadoRepositorio.obtenerTodos();
    res.json({ abogados });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener abogados' });
  }
});

abogadoRoutes.post('/crearAbogado', async (req, res) => {
  try {
    const { identificacion, nombre, correo, contrasena, especialidad, num_licencia } = req.body;
    const abogado = await crearAbogado({ 
      identificacion, 
      nombre, 
      correo, 
      contrasena, 
      especialidad, 
      numLicencia: num_licencia 
    });
    res.json({ mensaje: 'Abogado creado', abogado });
  } catch (error) {
    console.error('Error creando abogado:', error);
    res.status(500).json({ error: error.message });
  }
});