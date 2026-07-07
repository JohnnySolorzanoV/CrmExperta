import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import bcrypt from 'bcrypt'

var __filename = fileURLToPath(import.meta.url)
var __dirname = path.dirname(__filename)

var DB_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
if (!DB_URL) {
  throw new Error('Falta DATABASE_URL_TEST (o DATABASE_URL) para correr integracion')
}

var pool = new pg.Pool({
  connectionString: DB_URL,
  ssl: false,
})

var disponibilidadCache = null

function tablaSeguro(nombre) {
  // Avoid quoted identifiers so Postgres resolves names case-insensitively
  // (e.g. Usuario -> usuario), matching how init.sql creates tables.
  return nombre
}

export async function resetearBasePruebas() {
  var tablas = ['Documento', 'Cita', 'Calendario', 'Chatbot', 'Caso', 'Administrador', 'Cliente', 'Abogado', 'Usuario']

  await pool.query('BEGIN')
  try {
    for (var t of tablas) {
      await pool.query('DROP TABLE IF EXISTS ' + tablaSeguro(t) + ' CASCADE')
    }

    var sqlPath = path.resolve(__dirname, '../../../database/init.sql')
    var schemaSql = await fs.readFile(sqlPath, 'utf-8')
    await pool.query(schemaSql)
    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e
  }
}

export async function dbPruebasDisponible() {
  if (disponibilidadCache !== null) return disponibilidadCache

  try {
    await pool.query('SELECT 1')
    disponibilidadCache = true
  } catch (_) {
    disponibilidadCache = false
  }

  return disponibilidadCache
}

export async function cerrarPoolPruebas() {
  await pool.end()
}

export async function queryTest(sql, params = []) {
  return pool.query(sql, params)
}

export async function sembrarUsuariosBase() {
  var passHash = await bcrypt.hash('Clave123*', 10)

  var c1 = await queryTest(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    ['0101000001', 'Cliente Test', 'cliente@test.com', passHash]
  )

  var a1 = await queryTest(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    ['0102000002', 'Abogado Test', 'abogado@test.com', passHash]
  )

  var admin = await queryTest(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    ['0103000003', 'Admin Test', 'admin@test.com', passHash]
  )

  var clienteRow = await queryTest(
    `INSERT INTO Cliente (id_usuario, direccion, telefono)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [c1.rows[0].id, 'Direccion test', '0990000000']
  )

  var abogadoRow = await queryTest(
    `INSERT INTO Abogado (id_usuario, num_licencia, especialidad)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [a1.rows[0].id, 'MAT-TEST-001', 'Civil']
  )

  await queryTest(
    `INSERT INTO Administrador (id_usuario) VALUES ($1)`,
    [admin.rows[0].id]
  )

  return {
    clienteUsuarioId: c1.rows[0].id,
    abogadoUsuarioId: a1.rows[0].id,
    adminUsuarioId: admin.rows[0].id,
    clientePkId: clienteRow.rows[0].id,
    abogadoPkId: abogadoRow.rows[0].id,
    passwordPlano: 'Clave123*',
  }
}
