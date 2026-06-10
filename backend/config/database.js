import { default as pg } from 'pg'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

var DB_URL = process.env.DATABASE_URL || 'postgres://postgres:admin1234@localhost:5432/crm_experta'
var __dirname = dirname(fileURLToPath(import.meta.url))

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

// verifica si la tabla 'usuario' existe en la BD, lo que indica que las tablas ya han sido creadas
async function verificarTablas() {
  var resultado = await connxion.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuario')"
  )
  return resultado.rows[0].exists
}

// crea las tablas de la BD a partir del archivo init.sql
// solo funciona si no se han creado las tablas, es decir, si la tabla 'usuario' no existe
async function ejecutarInitSql() {
  var ruta = resolve(__dirname, '../../database/init.sql')
  var sql = readFileSync(ruta, 'utf8')
  var sentencias = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)
  for (var s of sentencias) {
    await connxion.query(s)
  }
  console.log('esquema de BD creado desde init.sql')
}

// prueba la conexión a la BD y verifica si las tablas existen, si no, las crea a partir del archivo init.sql
export async function probarConexion() {
  try {
    await connxion.query('SELECT 1')
    console.log('bd conectada ok')
    var tablasExisten = await verificarTablas()
    if (!tablasExisten) {
      console.log('tablas no encontradas, ejecutando init.sql...')
      await ejecutarInitSql()
    }
  } catch (e) {
    console.error('error conectando bd:', e.message)
    throw e
  }
}
