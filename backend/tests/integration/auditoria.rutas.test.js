import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { formatearEnGuayaquil } from '../../config/datetime.js'
import { verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase, queryTest } from '../helpers/dbTestUtils.js'

describe('Integracion GET /api/auditoria', () => {
  var ids
  var tokenAdmin
  var tokenCliente

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenAdmin = crearTokenTest({ id: ids.adminUsuarioId, correo: 'admin@test.com', roles: ['administrador'] })
    tokenCliente = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
    await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'cliente@test.com', contrasena: ids.passwordPlano })
  })

  it('AUD-API-01 el administrador lista auditoria y el cliente recibe 403', async () => {
    var ok = await request(APP)
      .get('/api/auditoria')
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(ok.status).toBe(200)
    expect(Array.isArray(ok.body.registros)).toBe(true)
    expect(ok.body.total).toBeGreaterThanOrEqual(1)
    expect(ok.body.conteos).toBeTruthy()

    var denegado = await request(APP)
      .get('/api/auditoria')
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(denegado.status).toBe(403)
  })

  it('AUD-API-02 el filtro desde/hasta acota el rango de la sesion', async () => {
    var futuro = await request(APP)
      .get('/api/auditoria')
      .query({ desde: '2099-01-01T00:00:00.000Z', hasta: '2099-01-02T00:00:00.000Z' })
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(futuro.status).toBe(200)
    expect(futuro.body.total).toBe(0)

    var pasado = await request(APP)
      .get('/api/auditoria')
      .query({ desde: '2000-01-01T00:00:00.000Z', hasta: '2099-12-31T23:59:59.000Z' })
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(pasado.status).toBe(200)
    expect(pasado.body.total).toBeGreaterThanOrEqual(1)
  })

  it('AUD-API-03 el CSV respeta el rango y un no-admin no puede exportar', async () => {
    var csv = await request(APP)
      .get('/api/auditoria/export.csv')
      .query({ desde: '2000-01-01T00:00:00.000Z', hasta: '2099-12-31T23:59:59.000Z' })
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(csv.status).toBe(200)
    expect(String(csv.headers['content-type'])).toContain('text/csv')
    expect(csv.text).toContain('LOGIN')
    expect(csv.text).toContain('usuario_nombre')

    var exportado = await queryTest(
      "SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE accion = 'EXPORTAR' AND recurso = 'Auditoria'"
    )
    expect(exportado.rows[0].n).toBeGreaterThanOrEqual(1)

    var denegado = await request(APP)
      .get('/api/auditoria/export.csv')
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(denegado.status).toBe(403)
  })

  it('AUD-API-04 el CSV muestra fecha en hora de Guayaquil, no ISO UTC', async () => {
    var instanteUtc = '2026-08-15 05:30:00'
    await queryTest(
      `INSERT INTO auditoria_logs (usuario_id, usuario_nombre, accion, recurso, resultado, fecha)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ids.adminUsuarioId, 'Admin Test', 'FECHA_GYE_TEST', 'Auditoria', 'exito', instanteUtc]
    )

    var csv = await request(APP)
      .get('/api/auditoria/export.csv')
      .query({ desde: '2026-08-15T00:00:00.000Z', hasta: '2026-08-15T23:59:59.000Z', accion: 'FECHA_GYE_TEST' })
      .set('Authorization', 'Bearer ' + tokenAdmin)
    expect(csv.status).toBe(200)

    var esperado = formatearEnGuayaquil(instanteUtc, { dateStyle: 'short', timeStyle: 'medium' })
    expect(esperado).toBeTruthy()
    expect(csv.text).toContain(esperado)
    expect(csv.text).not.toMatch(/2026-08-15T05:30:00/)
    expect(csv.text).not.toContain('2026-08-15 05:30:00')
  })
})
