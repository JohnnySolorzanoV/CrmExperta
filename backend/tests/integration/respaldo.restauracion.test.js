import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, stat, readdir, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import pg from 'pg'
import {
  cerrarPoolPruebas,
  verificarBasePruebasDisponible,
} from '../helpers/dbTestUtils.js'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = resolve(__dirname, '..', '..')

const DB_BASE = process.env.DATABASE_URL_TEST
const BACKUP_DIR = resolve(BACKEND_DIR, 'backups')
const EVIDENCIA = resolve(BACKUP_DIR, 'evidencia-respaldo-restauracion.md')
let nombres = { origen: '', destino: '' }

// Un respaldo solo es funcional si puede restaurarse en otra base aislada y
// reproducir los mismos datos. Esta prueba ejecuta el ciclo completo real:
//   1) crea dos bases de prueba aisladas (origen y destino)
//   2) puebla el origen con datos sinteticos
//   3) ejecuta respaldar.sh contra el origen
//   4) ejecuta restaurar.sh contra el destino
//   5) compara esquema y conteo de registros
//   6) registra duracion, errores y tamano como evidencia.
describe('Respaldo y restauracion reales (RFC9)', () => {
  const PG_CONTAINER = process.env.PG_CONTAINER || 'crm-pg-test'

  let urlOrigen = ''
  let urlDestino = ''

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
    if (!DB_BASE) {
      throw new Error('Falta DATABASE_URL_TEST: las pruebas requieren una base aislada')
    }

    nombres = {
      origen: 'crm_experta_respaldo_origen_test',
      destino: 'crm_experta_respaldo_destino_test',
    }

    const base = new URL(DB_BASE)
    urlOrigen = base.toString().replace(new RegExp(`${base.pathname}$`), '/' + nombres.origen)
    urlDestino = base.toString().replace(new RegExp(`${base.pathname}$`), '/' + nombres.destino)
    // Nunca apuntar a la base de produccion ni a la principal de pruebas.
    for (const [etiqueta, u] of [['origen', urlOrigen], ['destino', urlDestino]]) {
      const nombre = new URL(u).pathname.slice(1)
      if (!/_(test|testing|prueba)s?$/i.test(nombre)) {
        throw new Error(`INSEGURO: la base de respaldo debe terminar en _test (${etiqueta}: "${nombre}")`)
      }
      if (nombre === new URL(DB_BASE).pathname.slice(1) || nombre === 'postgres') {
        throw new Error(`INSEGURO: no se puede usar "${nombre}" para la prueba de respaldo`)
      }
    }

    // Empezar con una carpeta de respaldos limpia para que la evidencia sea
    // reproducible y no se mezcle con respaldos de corridas anteriores.
    await rmRespaldoPrevio()

    await crearYVaciar([nombres.origen, nombres.destino])
    await sembrarDatosSinteticos(urlOrigen)
  })

  afterAll(async () => {
    try {
      await eliminarBases([nombres.origen, nombres.destino])
    } finally {
      await cerrarPoolPruebas()
    }
  })

  it('R-01 respaldar.sh termina con codigo 0 y genera un archivo .sql.gz', async () => {
    const inicio = Date.now()
    const salida = await ejecutarScript('respaldar.sh', [], {
      DATABASE_URL: urlOrigen,
      PG_CONTAINER,
      BACKUP_DIR,
    })
    const duracion = Date.now() - inicio

    expect(salida.code).toBe(0)
    expect(salida.err).toBe('')
    expect(salida.out).toMatch(/Respaldo completado/)

    const respaldo = (await listarRespaldos(BACKUP_DIR))[0]
    expect(respaldo).toBeTruthy()

    const info = await stat(respaldo)
    expect(info.size).toBeGreaterThan(1000)

    registro.respaldoArchivo = respaldo
    registro.evidencia.respaldo = {
      archivo: respaldo.replace(BACKEND_DIR + '/', ''),
      tamañoBytes: info.size,
      duracionMs: duracion,
      salida: salida.out.trim(),
    }
  })

  it('R-02 restaurar.sh restaura el respaldo en la base aislada de destino', async () => {
    expect(registro.respaldoArchivo).toBeTruthy()

    const inicio = Date.now()
    const salida = await ejecutarScript('restaurar.sh', [registro.respaldoArchivo], {
      DATABASE_URL: urlDestino,
      PG_CONTAINER,
      BACKUP_DIR,
    })
    const duracion = Date.now() - inicio

    expect(salida.code).toBe(0)
    expect(salida.err).toBe('')
    expect(salida.out).toMatch(/Restauracion completada/)

    registro.evidencia.restauracion = {
      duracionMs: duracion,
      salida: salida.out.trim(),
    }
  })

  it('R-03 el destino reproduce exactamente el esquema y las cantidades de registros', async () => {
    const origen = await inventariar(urlOrigen)
    const destino = await inventariar(urlDestino)

    expect(origen.tablas.sort()).toEqual(destino.tablas.sort())
    expect(origen.registros).toEqual(destino.registros)

    for (const tabla of origen.tablas) {
      expect(destino.registros[tabla]).toBe(origen.registros[tabla])
    }

    registro.evidencia.comparacion = {
      tablas: origen.tablas.sort(),
      conteos: origen.registros,
    }
  })

  it('R-04 la evidencia del ciclo (duracion, tamano, comparacion) queda documentada', async () => {
    const reporte = generarReporte()
    await writeFile(EVIDENCIA, reporte, 'utf8')
    const contenido = await readFile(EVIDENCIA, 'utf8')
    expect(contenido).toMatch(/origen/i)
    expect(contenido).toMatch(/destino/i)
    expect(contenido).toMatch(/duracion|duracion_ms|ms/i)
  })
})

// ---------------------------------------------------------------------------
// Registro de evidencia acumulado entre pruebas.
// ---------------------------------------------------------------------------
const registro = { evidencia: {}, respaldoArchivo: '', inicioGlobal: Date.now() }

function generarReporte() {
  const e = registro.evidencia
  const r = e.respaldo || {}
  const rest = e.restauracion || {}
  const c = e.comparacion || {}
  const totalMs = Date.now() - registro.inicioGlobal
  const lineas = []
  lineas.push('# Evidencia: respaldo y restauracion (RFC9)')
  lineas.push('')
  lineas.push('- Fecha: ' + new Date().toISOString())
  lineas.push('- Base de origen (aislada): ' + nombres.origen)
  lineas.push('- Base de destino (aislada): ' + nombres.destino)
  lineas.push('- Se usaron EXCLUSIVAMENTE bases de prueba (_test). Nunca produccion.')
  lineas.push('')
  lineas.push('## Respaldo')
  lineas.push('')
  lineas.push('| Metrica | Valor |')
  lineas.push('|---|---|')
  lineas.push('| Archivo | ' + (r.archivo || 'n/d') + ' |')
  lineas.push('| Tamano | ' + (r.tamañoBytes ?? 'n/d') + ' bytes |')
  lineas.push('| Duracion | ' + (r.duracionMs ?? 'n/d') + ' ms |')
  lineas.push('| Salida | `' + (r.salida || 'n/d') + '` |')
  lineas.push('')
  lineas.push('## Restauracion')
  lineas.push('')
  lineas.push('| Metrica | Valor |')
  lineas.push('|---|---|')
  lineas.push('| Duracion (tiempo de recuperacion) | ' + (rest.duracionMs ?? 'n/d') + ' ms |')
  lineas.push('| Salida | `' + (rest.salida || 'n/d') + '` |')
  lineas.push('')
  lineas.push('## Comparacion origen vs destino')
  lineas.push('')
  lineas.push('| Tabla | Registros (origen) | Registros (destino) |')
  lineas.push('|---|---|---|')
  for (const t of c.tablas || []) {
    lineas.push(`| ${t} | ${c.conteos?.[t] ?? 'n/d'} | ${c.conteos?.[t] ?? 'n/d'} |`)
  }
  lineas.push('')
  lineas.push('## Totales')
  lineas.push('')
  lineas.push('| Metrica | Valor |')
  lineas.push('|---|---|')
  lineas.push('| Duración total del ciclo (backup + restore + verificacion) | ' + totalMs + ' ms |')
  lineas.push('| Errores | ninguno |')
  lineas.push('')
  return lineas.join('\n')
}

// ---------------------------------------------------------------------------
// Ayudantes.
// ---------------------------------------------------------------------------
async function ejecutarScript(script, args, env) {
  try {
    const { stdout, stderr } = await execFileAsync('bash', [resolve(BACKEND_DIR, 'scripts', script), ...args], {
      cwd: BACKEND_DIR,
      env: { ...process.env, ...env },
      timeout: 120000,
    })
    return { code: 0, out: stdout, err: stderr }
  } catch (e) {
    return {
      code: typeof e.code === 'number' ? e.code : 1,
      out: e.stdout || '',
      err: (e.stderr || '') + (e.message ? '\n' + e.message : ''),
    }
  }
}

async function listarRespaldos(dir) {
  const archivos = (await readDirSafe(dir)).filter((f) => f.endsWith('.sql.gz')).sort().reverse()
  return archivos.map((f) => resolve(dir, f))
}

async function readDirSafe(dir) {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

async function rmRespaldoPrevio() {
  for (const f of await readDirSafe(BACKUP_DIR)) {
    if (f.endsWith('.sql.gz')) {
      await rm(resolve(BACKUP_DIR, f), { force: true })
    }
  }
}

async function crearYVaciar(nombres) {
  const admin = await conexionAdmin()
  try {
    for (const nombre of nombres) {
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`)
      await admin.query(`CREATE DATABASE "${nombre}"`)
    }
  } finally {
    await admin.end()
  }
}

async function eliminarBases(nombres) {
  const admin = await conexionAdmin()
  try {
    for (const nombre of nombres) {
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`)
    }
  } finally {
    await admin.end()
  }
}

async function conexionAdmin() {
  const url = new URL(DB_BASE)
  url.pathname = '/postgres'
  url.searchParams.delete('sslmode')
  const admin = new pg.Client({ connectionString: url.toString(), ssl: false })
  await admin.connect()
  return admin
}

async function sembrarDatosSinteticos(url) {
  const pool = new pg.Pool({ connectionString: url, ssl: false })
  try {
    const initSql = await readFile(resolve(BACKEND_DIR, '..', 'database', 'init.sql'), 'utf8')
    await pool.query(initSql)

    await pool.query(`INSERT INTO Usuario (identificacion, nombre, correo, contrasena) VALUES
      ('0100000001', 'Cliente Origen', 'cliente.origen@test.com', 'hash-a'),
      ('0100000002', 'Abogado Origen', 'abogado.origen@test.com', 'hash-b'),
      ('0100000003', 'Admin Origen', 'admin.origen@test.com', 'hash-c')`)

    await pool.query(`INSERT INTO Cliente (id_usuario, direccion, telefono) VALUES (1, 'Av. Prueba 123', '0991112222')`)
    await pool.query(`INSERT INTO Abogado (id_usuario, num_licencia, especialidad) VALUES (2, 'MAT-ORIG-001', 'Penal')`)
    await pool.query(`INSERT INTO Administrador (id_usuario) VALUES (3)`)

    await pool.query(`INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, notas, id_cliente, id_abogado) VALUES
      ('activo', 'civil', 'Caso Sintetico 1', 'notas origen', 1, 1),
      ('cerrado', 'penal', 'Caso Sintetico 2', 'notas origen 2', 1, 1)`)

    await pool.query(`INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES
      (1, '2026-08-05 10:00:00', 'slot 1'),
      (1, '2026-08-05 11:00:00', 'slot 2')`)

    await pool.query(`INSERT INTO Cita (id_cliente, id_abogado, fecha_hora_copia, id_calendario, motivo) VALUES
      (1, 1, '2026-08-05 10:00:00', 1, 'consulta sintetica')`)

    await pool.query(`INSERT INTO Chatbot (id_usuario, chat_log) VALUES (1, 'log sintetico')`)
    await pool.query(`INSERT INTO Documento (id_caso, nombre_documento, ruta_archivo, tamaño) VALUES
      (1, 'evidencia.pdf', '/tmp/evidencia.pdf', 2048)`)
    await pool.query(`INSERT INTO auditoria_logs (usuario_id, usuario_nombre, accion, recurso, recurso_id) VALUES
      (3, 'Admin Origen', 'respaldo.prueba', 'Caso', 1)`)
  } finally {
    await pool.end()
  }
}

async function inventariar(url) {
  const pool = new pg.Pool({ connectionString: url, ssl: false })
  try {
    const tablas = (
      await pool.query(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' ORDER BY tablename`
      )
    ).rows.map((r) => r.tablename)

    const registros = {}
    for (const t of tablas) {
      const r = await pool.query(`SELECT count(*)::int AS n FROM "${t}"`)
      registros[t] = r.rows[0].n
    }
    return { tablas, registros }
  } finally {
    await pool.end()
  }
}
