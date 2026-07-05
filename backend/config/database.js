import { default as pg } from 'pg'
import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: resolve(__dirname, '..', '.env') })

export const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:admin1234@localhost:5432/crm_experta'

export function crearConfigPool() {
  var url = new URL(DB_URL)
  url.searchParams.delete('sslmode')

  var usaSsl = /ondigitalocean\.com/i.test(url.host)
console.log("conectando a digital ocean")
  return {
    connectionString: url.toString(),
    ssl: usaSsl ? { rejectUnauthorized: false } : false
  }
}

var connxion = new pg.Pool(crearConfigPool())

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
