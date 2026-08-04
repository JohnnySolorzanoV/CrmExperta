import { default as pg } from 'pg'
import './env.js'
import { log } from './logger.js'

// Keep PostgreSQL TIMESTAMP (without timezone) as raw text.
// We normalize explicitly in app code to avoid implicit local-time shifts.
pg.types.setTypeParser(1114, (value) => value)

export const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:admin1234@localhost:5432/crm_experta'

export function crearConfigPool() {
  var url = new URL(DB_URL)
  url.searchParams.delete('sslmode')

  var usaSsl = /ondigitalocean\.com/i.test(url.host)
  return {
    connectionString: url.toString(),
    ssl: usaSsl ? { rejectUnauthorized: false } : false
  }
}

var pool = null

export function obtenerPool() {
  if (!pool) {
    pool = new pg.Pool(crearConfigPool())
    pool.on('error', (e) => {
      // Un error en una conexión a la espera de liberarse no debe tumbar el proceso.
      log.warn('DB_POOL_ERR', { err: e?.message })
    })
  }
  return pool
}

export async function ejecutarConsulta(txt, prms = []) {
  var cnn = null
  try {
    cnn = await obtenerPool().connect()
    return await cnn.query(txt, prms)
  } catch (e) {
    log.error('DB_QUERY_ERR', { err: e.message })
    throw e
  } finally {
    if (cnn) cnn.release()
  }
}

// Ejecuta varias operaciones en una transacción. `task` recibe un cliente y debe
// usar `cliente.query(...)`. Si algo falla, todo se revierte.
export async function ejecutarEnTransaccion(task) {
  var cnn = await obtenerPool().connect()
  try {
    await cnn.query('BEGIN')
    var resultado = await task(cnn)
    await cnn.query('COMMIT')
    return resultado
  } catch (e) {
    try { await cnn.query('ROLLBACK') } catch (_) { /* pool puede estar roto */ }
    throw e
  } finally {
    cnn.release()
  }
}

// prueba solo la conexión a la BD para el arranque de la app
export async function probarConexion() {
  try {
    await obtenerPool().query('SELECT 1')
    log.info('DB_CONNECT_OK', {})
  } catch (e) {
    var mensaje = e?.message || e?.code || 'Error desconocido de conexion'
    log.error('DB_CONNECT_ERR', { err: { code: e?.code, message: mensaje } })
    throw e
  }
}

// Reintenta la conexión con espera entre intentos. Permite que el servicio
// arranque cuando la base aún se está levantando y vuelva a operar tras una caída.
export async function iniciarConexionConReintentos({
  intentosMax = Number(process.env.DB_REINTENTOS || 6),
  esperaMs = Number(process.env.DB_ESPERA_MS || 5000),
} = {}) {
  let intento = 0
  while (true) {
    intento++
    try {
      await probarConexion()
      return { conectado: true, intentosRealizados: intento }
    } catch (e) {
      if (intento >= intentosMax) {
        throw e
      }
      log.warn('DB_RECONEXION', { intento, esperaMs })
      await new Promise((res) => setTimeout(res, esperaMs))
    }
  }
}

// Cierre ordenado del pool en el apagado del proceso. Al reiniciar o al volver
// a consultar, `obtenerPool()` recrea la conexión (recuperación en proceso).
export async function cerrarConexiones() {
  try {
    if (pool) {
      await pool.end()
      pool = null
      log.info('DB_CONNEXION_CERRADA', {})
    }
  } catch (e) {
    log.warn('DB_CIERRE_ERR', { err: e?.message })
  }
}
