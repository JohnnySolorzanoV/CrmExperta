import { existsSync, readFileSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { cerrarConexiones, ejecutarConsulta, probarConexion } from '../../config/database.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = resolve(__dirname, '..', '..')

describe('Integracion recuperacion y respaldo', () => {
  it('REC-01 cerrarConexiones y reconexion permiten conservar los datos de prueba', async () => {
    await ejecutarConsulta('DROP TABLE IF EXISTS _t_respaldo')
    await ejecutarConsulta('CREATE TABLE _t_respaldo (id serial PRIMARY KEY, valor text)')
    await ejecutarConsulta("INSERT INTO _t_respaldo (valor) VALUES ('persistente')")

    await cerrarConexiones()
    var r = await ejecutarConsulta('SELECT valor FROM _t_respaldo WHERE id = 1')
    expect(r.rows[0].valor).toBe('persistente')

    await ejecutarConsulta('DROP TABLE _t_respaldo')
  })

  it('REC-02 el script de respaldo referencia pg_dump/gzip y es ejecutable', () => {
    var ruta = resolve(BACKEND_DIR, 'scripts', 'respaldar.sh')
    expect(existsSync(ruta)).toBe(true)
    var contenido = readFileSync(ruta, 'utf8')
    expect(contenido).toMatch(/pg_dump/)
    expect(contenido).toMatch(/gzip/)
    if (process.platform !== 'win32') {
      expect(statSync(ruta).mode & 0o111).not.toBe(0)
    }
  })

  it('REC-03 cierra el pool sin errores', async () => {
    await expect(cerrarConexiones()).resolves.toBeUndefined()
    await expect(probarConexion()).resolves.not.toThrow()
  })
})