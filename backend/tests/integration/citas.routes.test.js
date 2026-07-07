import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { dbPruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/citas', () => {
  var baseIds
  var tokenCliente
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()

    tokenCliente = crearTokenTest({
      id: baseIds.clienteUsuarioId,
      correo: 'cliente@test.com',
      roles: ['cliente'],
    })
  })

  it('POST /api/citas crea una cita', async () => {
    if (!dbLista) return
    var body = {
      idCliente: baseIds.clienteUsuarioId,
      idAbogado: baseIds.abogadoUsuarioId,
      fechaHoraCopia: '2026-08-01T10:15:00.000Z',
      motivo: 'Primera consulta',
    }

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send(body)

    expect(r.status).toBe(201)
    expect(r.body.cita).toBeTruthy()
    expect(r.body.cita.idAbogado).toBe(baseIds.abogadoPkId)
  })

  it('POST /api/citas rechaza conflicto de misma hora del abogado', async () => {
    if (!dbLista) return
    var citaBase = {
      idCliente: baseIds.clienteUsuarioId,
      idAbogado: baseIds.abogadoUsuarioId,
      fechaHoraCopia: '2026-08-01T10:15:00.000Z',
      motivo: 'Consulta A',
    }

    await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send(citaBase)
      .expect(201)

    var r2 = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        ...citaBase,
        fechaHoraCopia: '2026-08-01T10:45:00.000Z',
        motivo: 'Consulta B',
      })

    expect(r2.status).toBe(409)
    expect(r2.body.error).toBe('Este abogado ya tiene una cita en esa hora')
  })

  it('GET /api/citas sin token devuelve 401', async () => {
    if (!dbLista) return
    var r = await request(APP).get('/api/citas')
    expect(r.status).toBe(401)
    expect(r.body.error).toBe('Token requerido')
  })

  it('GET /api/citas/cliente/:idUsuario devuelve fechas en ISO UTC', async () => {
    if (!dbLista) return
    await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: '2026-08-01T10:15:00',
        motivo: 'Consulta UTC',
      })
      .expect(201)

    var r = await request(APP)
      .get('/api/citas/cliente/' + baseIds.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)

    expect(r.status).toBe(200)
    expect(r.body.citas.length).toBeGreaterThan(0)
    expect(r.body.citas[0].fechaHoraCopia).toMatch(/Z$/)
  })

  it('GET /api/citas/cliente/:idUsuario admite id interno por compatibilidad', async () => {
    if (!dbLista) return
    await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: '2026-08-01T10:15:00.000Z',
        motivo: 'Compatibilidad',
      })
      .expect(201)

    var r = await request(APP)
      .get('/api/citas/cliente/' + baseIds.clientePkId)
      .set('Authorization', 'Bearer ' + tokenCliente)

    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.citas)).toBe(true)
    expect(r.body.citas.length).toBeGreaterThan(0)
  })
})
