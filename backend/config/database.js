import { default as pg } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

var DB_URL = process.env.DATABASE_URL || 'postgres://postgres:admin1234@localhost:5432/crm_experta'

var connxion = new pg.Pool({
  connectionString: DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export async function ejecutarConsulta(txt, prms = []) {
  var cnn = null
  try {
    cnn = await connxion.connect()
    return await cnn.query(txt, prms)
  } catch (e) {
    console.error('error BD:', e.message)
    throw e
  } finally {
    if (cnn) cnn.release()
  }
}

// prueba solo la conexión a la BD para el arranque de la app
export async function probarConexion() {
  try {
    await connxion.query('SELECT 1')
    console.log('bd conectada ok')
  } catch (e) {
    console.error('error conectando bd:', e.message)
    throw e
  }
}
