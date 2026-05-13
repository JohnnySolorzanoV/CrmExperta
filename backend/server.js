import express from 'express';
import cors from 'cors';
import { probarConexion } from './external_integrations/baseDatos.js';

import {loginRoutes} from './api/login.js';
import {registroRoutes} from './api/registro.js';
import {abogadoRoutes} from './api/abogado.js';

const app = express();
const puerto = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// rutas
app.use('/api', loginRoutes);
app.use('/api/registro', registroRoutes);
app.use('/api/abogado', abogadoRoutes);

app.get('/api/estado', (req, res) => {
  res.json({ mensaje: 'Servidor CRM Experta funcionando' });
});

// iniciar servidor
async function iniciar() {
  try {
    await probarConexion();
    app.listen(puerto, () => {
      console.log(`Servidor en http://localhost:${puerto}`);
    });
  } catch (error) {
    console.error('No se pudo conectar a la BD:', error.message);
    process.exit(1);
  }
}

iniciar();
