import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase, proximaFranjaLaborable } from '../helpers/dbTestUtils.js'

describe('Integracion /api/citas', () => {
  var baseIds
  var tokenCliente

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()

    tokenCliente = crearTokenTest({
      id: baseIds.clienteUsuarioId,
      correo: 'cliente@test.com',
      roles: ['cliente'],
    })
  })

  it('INT-CITAS-01 POST /api/citas crea una cita valida y retorna su representacion', async () => {
    var body = {
      idCliente: baseIds.clienteUsuarioId,
      idAbogado: baseIds.abogadoUsuarioId,
      fechaHoraCopia: proximaFranjaLaborable(),
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

  it('INT-CITAS-02 POST /api/citas rechaza conflictos cuando el abogado ya tiene una cita en la misma franja', async () => {
    var cuerpoBase = {
      idCliente: baseIds.clienteUsuarioId,
      idAbogado: baseIds.abogadoUsuarioId,
      fechaHoraCopia: proximaFranjaLaborable(),
      motivo: 'Consulta A',
    }

    await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send(cuerpoBase)
      .expect(201)

    var r2 = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        ...cuerpoBase,
        fechaHoraCopia: proximaFranjaLaborable({ minuto: 45 }),
        motivo: 'Consulta B',
      })

    expect(r2.status).toBe(409)
    expect(r2.body.error).toBe('Este abogado ya tiene una cita en esa hora')
  })

  it('INT-CITAS-03 GET /api/citas exige autenticacion y responde 401 sin token', async () => {
    var r = await request(APP).get('/api/citas')
    expect(r.status).toBe(401)
    expect(r.body.error).toBe('Token requerido')
  })

  it('INT-CITAS-04 GET /api/citas/cliente/:idUsuario devuelve fechas serializadas en ISO UTC', async () => {
    await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: proximaFranjaLaborable({ minuto: 15 }),
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

  it('INT-CITAS-05 GET /api/citas/cliente/:idUsuario admite id interno para mantener compatibilidad', async () => {
    await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: proximaFranjaLaborable({ minuto: 20 }),
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

  it('RF05-01 POST /api/citas rechaza una fecha en el pasado', async () => {
    var pasado = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: baseIds.clienteUsuarioId, idAbogado: baseIds.abogadoUsuarioId, fechaHoraCopia: pasado, motivo: 'Pasado' })
    expect(r.status).toBe(400)
    expect(r.body.error).toContain('pasado')
  })

  it('RF05-02 POST /api/citas rechaza un fin de semana', async () => {
    function encontrarFinDeSemanaFuturo() {
      var d = new Date()
      d.setDate(d.getDate() + 3)
      while (d.getDay() !== 0 && d.getDay() !== 6) d.setDate(d.getDate() + 1)
      d.setHours(10, 0, 0, 0)
      return d.toISOString()
    }
    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: baseIds.clienteUsuarioId, idAbogado: baseIds.abogadoUsuarioId, fechaHoraCopia: encontrarFinDeSemanaFuturo(), motivo: 'Finde' })
    expect(r.status).toBe(400)
    expect(r.body.error).toContain('fines de semana')
  })

  it('RF05-03 POST /api/citas rechaza una hora fuera del horario de atencion', async () => {
    var franjaInvalida = proximaFranjaLaborable({ hora: 22, minuto: 30 })
    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: baseIds.clienteUsuarioId, idAbogado: baseIds.abogadoUsuarioId, fechaHoraCopia: franjaInvalida, motivo: 'Fuera de horario' })
    expect(r.status).toBe(400)
    expect(r.body.error).toContain('horario de atencion')
  })

  it('RF15-01 el abogado confirma una cita y esta pasa de pendiente a confirmada', async () => {
    var creada = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: baseIds.clienteUsuarioId, idAbogado: baseIds.abogadoUsuarioId, fechaHoraCopia: proximaFranjaLaborable({ minuto: 30 }), motivo: 'Confirmacion' })
      .expect(201)

    expect(creada.body.cita.estadoCita).toBe('pendiente')

    var tokenAbogado = crearTokenTest({ id: baseIds.abogadoUsuarioId, correo: 'abogado@test.com', roles: ['abogado'] })
    var r = await request(APP)
      .put('/api/citas/' + creada.body.cita.id + '/aceptar')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    expect(r.body.cita.estadoCita).toBe('confirmada')
  })
})
