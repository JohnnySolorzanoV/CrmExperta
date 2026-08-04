import pg from 'pg'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import '../config/env.js'

// Elimina y recrea la base de datos indicada en DATABASE_URL, dejándola vacía
// (sin esquema ni datos) para que luego se pueda poblar con `npm run seed`.
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

var urlAdmin = new URL(DB_URL)
urlAdmin.pathname = '/postgres'
urlAdmin.searchParams.delete('sslmode')

async function baseExiste(cliente, nombre) {
  var r = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre])
  return r.rows.length > 0
}

async function main() {
  console.warn('ATENCION: se eliminara la base "' + dbDestino + '" y sus datos.')
  var admin = new pg.Client({ connectionString: urlAdmin.toString(), ssl: false })
  await admin.connect()

  if (await baseExiste(admin, dbDestino)) {
    await admin.query('DROP DATABASE IF EXISTS "' + dbDestino + '" WITH (FORCE)')
  }
  await admin.query('CREATE DATABASE "' + dbDestino + '"')
  await admin.end()

  console.log('Base "' + dbDestino + '" reiniciada (vacía). Ejecuta "npm run seed" para poblar el esquema.')
}

main().catch(function (e) {
  console.error('Error reseteando la base:', e.message)
  process.exit(1)
})