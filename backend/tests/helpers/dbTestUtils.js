import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import bcrypt from 'bcrypt'

var __filename = fileURLToPath(import.meta.url)
var __dirname = path.dirname(__filename)

// Las pruebas de integración deben correr SIEMPRE contra una base aislada, nunca
// contra la de producción. Si no se define DATABASE_URL_TEST, se aborta con error.
var DB_URL = process.env.DATABASE_URL_TEST
if (!DB_URL) {
  throw new Error('Falta DATABASE_URL_TEST: las pruebas de integración requieren una base aislada (nunca la de producción)')
}

var pool = new pg.Pool({
  connectionString: DB_URL,
  ssl: false,
})

function tablaSeguro(nombre) {
  // Avoid quoted identifiers so Postgres resolves names case-insensitively
  // (e.g. Usuario -> usuario), matching how init.sql creates tables.
  return nombre
}

export async function resetearBasePruebas() {
  // Seguridad: nunca reconstruir una base cuyo contenedor no sea de pruebas.
  var nombreBd = new URL(DB_URL).pathname.slice(1) || ''
  if (!/_test/.test(nombreBd)) {
    throw new Error(
      'resetearBasePruebas solo puede ejecutarse contra una base de pruebas (nombre *_test). Recibido: "' + nombreBd + '"'
    )
  }

  var tablas = ['Documento', 'Cita', 'Calendario', 'Chatbot', 'Caso', 'Administrador', 'Cliente', 'Abogado', 'Usuario', 'auditoria_logs']

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

var disponibilidadCache = null

// Verifica que la base de prueba esté disponible. Si NO lo está, lanza un error
// claro para que la suite falle sonoramente en vez de pasar sin ejecutar aserciones.
export async function verificarBasePruebasDisponible() {
  if (disponibilidadCache !== null) {
    if (disponibilidadCache) return true
    throw new Error('Base de pruebas NO disponible (verifica DATABASE_URL_TEST y que PostgreSQL este arriba)')
  }

  try {
    await pool.query('SELECT 1')
    disponibilidadCache = true
    return true
  } catch (e) {
    disponibilidadCache = false
    throw new Error(
      'Base de pruebas NO disponible: ' + (e?.message || e?.code || 'error de conexión') +
      '. Las pruebas de integración requieren PostgreSQL de pruebas.'
    )
  }
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

// Devuelve una franja horaria futura y laborable (lunes a viernes) para citas.
// Evita fechas fijas que queden en el pasado y fines de semana no laborables.
export function proximaFranjaLaborable({ hora = 10, minuto = 15, diasAdelante = 1 } = {}) {
  var d = new Date()
  d.setDate(d.getDate() + diasAdelante)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}
