import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import '../config/env.js'

var __dirname = dirname(fileURLToPath(import.meta.url))

var DB_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
if (!DB_URL) {
  console.error('Falta DATABASE_URL_TEST (o DATABASE_URL)')
  process.exit(1)
}

var url = new URL(DB_URL)
var dbDestino = url.pathname ? url.pathname.slice(1) : 'crm_experta_test'
if (!dbDestino) {
  console.error('La URL de prueba no indica una base de datos destino')
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
  var admin = new pg.Client({ connectionString: urlAdmin.toString(), ssl: false })
  await admin.connect()

  if (await baseExiste(admin, dbDestino)) {
    await admin.query('DROP DATABASE IF EXISTS "' + dbDestino + '" WITH (FORCE)')
  }
  await admin.query('CREATE DATABASE "' + dbDestino + '"')
  console.log('base de prueba creada:', dbDestino)
  await admin.end()

  var pool = new pg.Pool({ connectionString: DB_URL, ssl: false })
  var initSql = readFileSync(resolve(__dirname, '../../database/init.sql'), 'utf8')
  var sentencias = initSql.split(';').map(s => s.trim()).filter(s => s.length > 0)
  for (var s of sentencias) {
    await pool.query(s)
  }
  await pool.end()
  console.log('esquema init.sql aplicado en', dbDestino)
}

main().catch(function (e) {
  console.error('error creando base de pruebas:', e.message)
  console.error('Detalle:', e)
  process.exit(1)
})