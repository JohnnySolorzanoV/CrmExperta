import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import {
  verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase,
  proximaFranjaLaborable, queryTest
} from '../helpers/dbTestUtils.js'

// La consistencia entre cita, abogado y horario es responsabilidad del servidor:
// un idCalendario ajeno, con fecha distinta u ocupado debe rechazarse ANTES de
// guardar, y la validación + registro deben ser atómicos (sin datos parciales).
describe('Integracion consistencia cita-abogado-horario', () => {
  var baseIds
  var tokenCliente

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()
    tokenCliente = crearTokenTest({ id: baseIds.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
  })

  async function insertarSegundoAbogado() {
    var u = await queryTest(
      `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['0104000004', 'Abogado Dos', 'abogado2@test.com', 'hash-no-usado']
    )
    var a = await queryTest(
      `INSERT INTO Abogado (id_usuario, num_licencia, especialidad)
       VALUES ($1, $2, $3) RETURNING id`,
      [u.rows[0].id, 'MAT-TEST-002', 'Penal']
    )
    return a.rows[0].id
  }

  function insertarSlot(idAbogado, fechaEvento) {
    return queryTest(
      `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, NULL) RETURNING id`,
      [idAbogado, fechaEvento]
    )
  }

  async function contarCitas(idCalendario) {
    var r = await queryTest('SELECT count(*)::int AS n FROM Cita WHERE id_calendario = $1', [idCalendario])
    return r.rows[0].n
  }

  it('INT-CONS-01 rechaza 403 un idCalendario perteneciente a otro abogado y no guarda nada', async () => {
    var otroAbogadoPk = await insertarSegundoAbogado()
    var franja = proximaFranjaLaborable({ minuto: 20 })
    var slotAjeno = await insertarSlot(otroAbogadoPk, franja)

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: franja,
        idCalendario: slotAjeno.rows[0].id,
        motivo: 'Intento con horario de otro abogado',
      })

    expect(r.status).toBe(403)
    expect(await contarCitas(slotAjeno.rows[0].id)).toBe(0)
    var seguir = await queryTest('SELECT count(*)::int AS n FROM Calendario')
    expect(seguir.rows[0].n).toBe(1) // solo el slot ajeno, sin duplicados ni parciales
  })

  it('INT-CONS-02 rechaza 400 cuando la fecha del horario difiere de la enviada', async () => {
    var franjaCita = proximaFranjaLaborable({ hora: 10, minuto: 30 })
    var franjaSlotDiferente = proximaFranjaLaborable({ hora: 15, minuto: 30 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franjaSlotDiferente)

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: franjaCita,
        idCalendario: slot.rows[0].id,
        motivo: 'Fecha del horario distinta',
      })

    expect(r.status).toBe(400)
    expect(await contarCitas(slot.rows[0].id)).toBe(0)
  })

  it('INT-CONS-03 rechaza 409 un horario ya reservado', async () => {
    var franja = proximaFranjaLaborable({ minuto: 40 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franja)
    var slotId = slot.rows[0].id

    var primera = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: franja,
        idCalendario: slotId,
        motivo: 'Reserva A',
      })
    expect(primera.status).toBe(201)

    var segunda = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: franja,
        idCalendario: slotId,
        motivo: 'Reserva B',
      })

    expect(segunda.status).toBe(409)
    expect(await contarCitas(slotId)).toBe(1) // el slot sigue con una sola cita
  })

  it('INT-CONS-04 acepta 201 un horario propio, con fecha coincidente y libre', async () => {
    var franja = proximaFranjaLaborable({ minuto: 50 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franja)
    var slotId = slot.rows[0].id

    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: franja,
        idCalendario: slotId,
        motivo: 'Consulta valida',
      })

    expect(r.status).toBe(201)
    expect(r.body.cita.idCalendario).toBe(slotId)
    expect(await contarCitas(slotId)).toBe(1)
  })
})