import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import {
  verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase,
  proximaFranjaLaborable, queryTest
} from '../helpers/dbTestUtils.js'

// Doble reserva y atomicidad: una rechazada/cancelada libera el horario; las
// solicitudes simultáneas no producen doble reserva, horarios huérfanos ni dos
// citas vinculadas al mismo idCalendario.
describe('Integracion doble reserva, cancelacion y atomicidad', () => {
  var baseIds
  var tokenCliente
  var tokenAbogado

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()
    tokenCliente = crearTokenTest({ id: baseIds.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
    tokenAbogado = crearTokenTest({ id: baseIds.abogadoUsuarioId, correo: 'abogado@test.com', roles: ['abogado'] })
  })

  function insertarSlot(idAbogado, fechaEvento) {
    return queryTest(
      `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, NULL) RETURNING id`,
      [idAbogado, fechaEvento]
    )
  }

  function crearCitaConSlot(slotId, franja) {
    return request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: baseIds.clienteUsuarioId, idAbogado: baseIds.abogadoUsuarioId, fechaHoraCopia: franja, idCalendario: slotId, motivo: 'M' })
  }

  it('AT-01 una cita rechazada libera el horario y puede reutilizarse', async () => {
    var franja = proximaFranjaLaborable({ minuto: 5 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franja)
    var slotId = slot.rows[0].id

    var c1 = await crearCitaConSlot(slotId, franja)
    expect(c1.status).toBe(201)
    var rej = await request(APP)
      .put('/api/citas/' + c1.body.cita.id + '/rechazar')
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(rej.status).toBe(200)

    var c2 = await crearCitaConSlot(slotId, franja)
    expect(c2.status).toBe(201)
    var activas = await queryTest(
      "SELECT count(*)::int AS n FROM Cita WHERE id_calendario = $1 AND estado_cita NOT IN ('cancelada', 'rechazada')",
      [slotId]
    )
    expect(activas.rows[0].n).toBe(1) // la rechazada no bloquea: solo una reserva activa
  })

  it('AT-02 una cita cancelada libera el horario y puede reutilizarse', async () => {
    var franja = proximaFranjaLaborable({ minuto: 6 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franja)
    var slotId = slot.rows[0].id

    var c1 = await crearCitaConSlot(slotId, franja)
    expect(c1.status).toBe(201)
    var can = await request(APP)
      .put('/api/citas/' + c1.body.cita.id + '/cancelar')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ motivoCancelacion: 'Ya no podre asistir' })
    expect(can.status).toBe(200)

    var c2 = await crearCitaConSlot(slotId, franja)
    expect(c2.status).toBe(201)
  })

  it('AT-03 rechazar una cita sin slot tambien libera la franja horaria', async () => {
    var franja = proximaFranjaLaborable({ minuto: 7 })
    var c1 = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: baseIds.clienteUsuarioId, idAbogado: baseIds.abogadoUsuarioId, fechaHoraCopia: franja, motivo: 'Sin slot' })
    expect(c1.status).toBe(201)

    await request(APP)
      .put('/api/citas/' + c1.body.cita.id + '/rechazar')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .expect(200)

    var c2 = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: baseIds.clienteUsuarioId, idAbogado: baseIds.abogadoUsuarioId, fechaHoraCopia: franja, motivo: 'Reuso de franja' })
    expect(c2.status).toBe(201)
  })

  it('AT-04 dos solicitudes simultaneas con el mismo idCalendario producen una reserva y un 409', async () => {
    var franja = proximaFranjaLaborable({ minuto: 8 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franja)
    var slotId = slot.rows[0].id
    var cuerpo = { idCliente: baseIds.clienteUsuarioId, idAbogado: baseIds.abogadoUsuarioId, fechaHoraCopia: franja, idCalendario: slotId, motivo: 'Simultanea' }

    var [r1, r2] = await Promise.all([
      request(APP).post('/api/citas').set('Authorization', 'Bearer ' + tokenCliente).send(cuerpo),
      request(APP).post('/api/citas').set('Authorization', 'Bearer ' + tokenCliente).send(cuerpo),
    ])

    var estados = [r1.status, r2.status].sort()
    expect(estados).toEqual([201, 409])
    var vinculadas = await queryTest('SELECT count(*)::int AS n FROM Cita WHERE id_calendario = $1', [slotId])
    expect(vinculadas.rows[0].n).toBe(1)
  })

  it('AT-05 el fallo de reserva no deja horarios ni citas parciales', async () => {
    // Slot libre del abogado para el intento.
    var slotA = await insertarSlot(baseIds.abogadoPkId, proximaFranjaLaborable({ hora: 10, minuto: 30 }))
    var slotAId = slotA.rows[0].id

    // Intento con fecha distinta a la del slot → 400, sin crear filas.
    var rFecha = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: proximaFranjaLaborable({ hora: 15, minuto: 30 }),
        idCalendario: slotAId,
        motivo: 'Fecha distinta',
      })
    expect(rFecha.status).toBe(400)

    var calendario = await queryTest('SELECT count(*)::int AS n FROM Calendario')
    var citas = await queryTest('SELECT count(*)::int AS n FROM Cita')
    expect(calendario.rows[0].n).toBe(1) // solo el slot del intento, sin huérfanos
    expect(citas.rows[0].n).toBe(0) // ninguna cita parcial
  })
})