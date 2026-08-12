import pg from 'pg'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import '../config/env.js'

// Elimina y recrea la base de datos indicada en DATABASE_URL, dejándola vacía
// (sin esquema ni datos) para que luego se pueda poblar con npm run seed.
// ELIMINA TODOS LOS DATOS. Usar solo para resetear entornos locales/prueba.
var __dirname = dirname(fileURLToPath(import.meta.url))

var DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}

var url = new URL(DB_URL)
var dbDestino = url.pathname ? url.pathname.slice(1) : ''
if (!dbDestino) {
  console.error('La URL no indica una base de datos destino')
  process.exit(1)
}

var usaSsl = /ondigitalocean\.com/i.test(DB_URL)
var urlAdmin = new URL(DB_URL)
urlAdmin.pathname = usaSsl ? '/defaultdb' : '/postgres'
urlAdmin.searchParams.delete('sslmode')

async function baseExiste(cliente, nombre) {
  var r = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre])
  return r.rows.length > 0
}

async function main() {
  console.warn('ATENCION: se eliminara la base "' + dbDestino + '" y sus datos.')
  var admin = new pg.Client({
    connectionString: urlAdmin.toString(),
    ssl: usaSsl ? { rejectUnauthorized: false } : false
  })
  await admin.connect()

  if (usaSsl) {
    // DigitalOcean gestiona el clúster: el usuario conectado no tiene permisos
    // para DROP DATABASE ni pg_terminate_backend. En su lugar se vacía la base
    // borrando y recreando el esquema, cuyos objetos son del usuario de la URL.
    console.log('DigitalOcean detectado: vaciando el esquema...')
    await admin.query('DROP SCHEMA public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query('GRANT ALL ON SCHEMA public TO public')
  } else if (await baseExiste(admin, dbDestino)) {
    // Entornos locales: termina las sesiones activas (p. ej. el backend en
    // ejecución) para que DROP DATABASE no falle por "database is being
    // accessed by other users" o versiones de Postgres sin WITH (FORCE).
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [dbDestino]
    )
    await admin.query('DROP DATABASE IF EXISTS "' + dbDestino + '"')
    await admin.query('CREATE DATABASE "' + dbDestino + '"')
  }
  await admin.end()

  console.log('Base "' + dbDestino + '" reiniciada (vacía). Ejecuta "npm run seed" para poblar el esquema.')
}

main().catch(function (e) {
  console.error('Error reseteando la base:', e.message)
  process.exit(1)
})