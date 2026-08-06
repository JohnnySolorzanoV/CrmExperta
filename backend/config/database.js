import { default as pg } from 'pg'
import './env.js'
import { log } from './logger.js'

// Keep PostgreSQL TIMESTAMP (without timezone) as raw text.
// We normalize explicitly in app code to avoid implicit local-time shifts.
pg.types.setTypeParser(1114, (value) => value)

const DB_URL = process.env.DATABASE_URL

if (!process.env.DATABASE_URL) {
  log.error('DB_CONFIG_MISSING', {
    err: { message: 'Falta DATABASE_URL. Es obligatoria y no se usa ningún valor predeterminado.' },
  })
  console.error('ERROR: Falta la variable de entorno DATABASE_URL.')
  process.exit(1)
}

export { DB_URL }

// Convierte un valor de entorno a número con un predeterminado seguro.
// Nunca debe reventar por valores ausentes, vacíos o no numéricos.
function numeroSeguro(raw, predeterminado, min = 0) {
  var n = Number(raw)
  if (!Number.isFinite(n)) return predeterminado
  return Math.max(min, n)
}

// Configuración del pool con valores por defecto seguros.
export function crearConfigPool() {
  var url = new URL(DB_URL)
  url.searchParams.delete('sslmode')

  var usaSsl = /ondigitalocean\.com/i.test(url.host)
  return {
    connectionString: url.toString(),
    ssl: usaSsl ? { rejectUnauthorized: false } : false,
    // El negocio se modela en UTC: fija la zona de sesion a UTC para que
    // NOW() y las comparaciones con columnas TIMESTAMP sean deterministas.
    options: '-c timezone=UTC',
    connectionTimeoutMillis: 10000,
    max: 5,
    idleTimeoutMillis: 30000,
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

// --- Reintentos con espera progresiva y cancelación -------------------------

// Incremento exponencial acotado con una pequeña variación aleatoria (±20%)
// para evitar que varias instancias se reconecten a la vez.
function calcularEsperaRetroceso(baseMs, maxMs, intento) {
  var exponencial = baseMs * Math.pow(2, intento - 1)
  var acotada = Math.min(exponencial, maxMs)
  var jitter = acotada * 0.2 * Math.random()
  return Math.max(0, acotada - jitter)
}

function errorAbortado() {
  var e = new Error('Reintento de conexion cancelado por apagado')
  e.code = 'DB_ABORTED'
  return e
}

// Espera que respeta la señal de apagado: se cancela de inmediato si llega SIGTERM/SIGINT.
function esperar(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) return reject(errorAbortado())
    var temporizador = setTimeout(resolve, ms)
    if (signal) {
      signal.addEventListener('abort', function enAbort() {
        clearTimeout(temporizador)
        reject(errorAbortado())
      }, { once: true })
    }
  })
}

// Comprueba PostgreSQL con reintentos controlados y espera progresiva. Si la
// señal de apagado se aborta, corta el ciclo y devuelve { cancelado: true }.
export async function iniciarConexionConReintentos(opts = {}) {
  var signal = opts.signal || null
  var intentosMax = numeroSeguro(opts.intentosMax, 0, 0)
  var esperaInicialMs = numeroSeguro(opts.esperaInicialMs, 2000, 1)
  var esperaMaxMs = numeroSeguro(opts.esperaMaxMs, 30000, 1)

  var intento = 0
  while (true) {
    if (signal && signal.aborted) return { cancelado: true }

    intento++
    log.info('DB_CONNECT_ATTEMPT', {
      intento,
      intentosMax: intentosMax === 0 ? 'ilimitado' : intentosMax,
    })

    try {
      await probarConexion()
      return { conectado: true, intentosRealizados: intento }
    } catch (e) {
      if (intentosMax !== 0 && intento >= intentosMax) throw e

      var esperaMs = calcularEsperaRetroceso(esperaInicialMs, esperaMaxMs, intento)
      log.info('DB_RETRY_SCHEDULED', { intento, esperaMs: Math.round(esperaMs) })

      try {
        await esperar(esperaMs, signal)
      } catch (a) {
        return { conectado: false, cancelado: true }
      }
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
