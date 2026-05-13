import { Pool } from 'pg';

const DEV_PORT = 5432;
const DEV_DB_NAME = 'crm_experta';
const DEV_DB_USER = 'postgres';
const DEV_DB_PASSWORD = 'admin1234';

// En producción, se espera que DATABASE_URL esté configurada en las variables de entorno
const connectionString = process.env.DATABASE_URL || `postgres://${DEV_DB_USER}:${DEV_DB_PASSWORD}@localhost:${DEV_PORT}/${DEV_DB_NAME}`;

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ejecutar consultas sql
export async function ejecutarSQL(texto, params = []) {
  let conexion = null;
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log({ texto, params });
    }

    // validar que el texto no esté vacío
    if (!texto) {
      throw new Error('El texto de la consulta SQL no puede estar vacío');
    }

    conexion = await pool.connect();
    return await conexion.query(texto, params);
  } finally {
    if (conexion) conexion.release();
  }
}

export async function probarConexion() {
  let conexion = null;
  try {
    conexion = await pool.connect();
    await conexion.query('SELECT 1');
    console.log('conexion a bd exitosa');
  } finally {
    if (conexion) conexion.release();
  }
}