import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import {
  verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase,
  proximaFranjaLaborable, queryTest
} from '../helpers/dbTestUtils.js'

// El cliente propietario de una cita debe poder reagendarla. El sistema no debe
// comparar al cliente con el abogado del horario: la propiedad de la cita se
// valida primero (verificarDuenoCita) y luego el horario contra el abogado de
// la cita.
describe('Integracion reagendamiento de citas', () => {
  var baseIds
  var tokenCliente
  var tokenOtroCliente
  var tokenAbogado

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()

    tokenCliente = crearTokenTest({ id: baseIds.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
    tokenAbogado = crearTokenTest({ id: baseIds.abogadoUsuarioId, correo: 'abogado@test.com', roles: ['abogado'] })

    var otro = await queryTest(
      `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['0105000005', 'Otro Cliente', 'otro@test.com', 'hash-no-usado']
    )
    await queryTest(
      `INSERT INTO Cliente (id_usuario, direccion, telefono) VALUES ($1, $2, $3)`,
      [otro.rows[0].id, 'Direccion otro', '0990000005']
    )
    tokenOtroCliente = crearTokenTest({ id: otro.rows[0].id, correo: 'otro@test.com', roles: ['cliente'] })
  })

  async function crearCita({ franja, motivo = 'Cita inicial', token = tokenCliente } = {}) {
    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + token)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: franja,
        motivo,
      })
    expect(r.status).toBe(201)
    return r.body.cita
  }

  function insertarSlot(idAbogado, fechaEvento) {
    return queryTest(
      `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, NULL) RETURNING id`,
      [idAbogado, fechaEvento]
    )
  }

  function reprogramar(citaId, payload, token) {
    return request(APP)
      .put('/api/citas/' + citaId + '/reprogramar')
      .set('Authorization', 'Bearer ' + token)
      .send(payload)
  }

  it('INT-REP-01 el cliente propietario reagenda con un horario valido del abogado', async () => {
    var franjaNueva = proximaFranjaLaborable({ hora: 10, minuto: 10 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franjaNueva)
    var cita = await crearCita({ franja: proximaFranjaLaborable({ hora: 11, minuto: 10 }) })

    var r = await reprogramar(cita.id, { fechaHoraCopia: franjaNueva, idCalendario: slot.rows[0].id }, tokenCliente)

    expect(r.status).toBe(200)
    expect(r.body.cita.estadoCita).toBe('reprogramada')
    expect(r.body.cita.idCalendario).toBe(slot.rows[0].id)
  })

  it('INT-REP-02 otro cliente recibe 403 al reagendar una cita ajena', async () => {
    var franjaNueva = proximaFranjaLaborable({ hora: 10, minuto: 20 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franjaNueva)
    var cita = await crearCita({ franja: proximaFranjaLaborable({ hora: 11, minuto: 20 }) })

    var r = await reprogramar(cita.id, { fechaHoraCopia: franjaNueva, idCalendario: slot.rows[0].id }, tokenOtroCliente)

    expect(r.status).toBe(403)
  })

  it('INT-REP-03 se rechaza con 403 un horario perteneciente a otro abogado', async () => {
    var franjaNueva = proximaFranjaLaborable({ hora: 10, minuto: 30 })

    var otroAbogado = await queryTest(
      `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['0106000006', 'Abogado Dos', 'abogado2@test.com', 'hash-no-usado']
    )
    var otroAbogadoPk = await queryTest(
      `INSERT INTO Abogado (id_usuario, num_licencia, especialidad)
       VALUES ($1, $2, $3) RETURNING id`,
      [otroAbogado.rows[0].id, 'MAT-TEST-002', 'Penal']
    )
    var slotAjeno = await insertarSlot(otroAbogadoPk.rows[0].id, franjaNueva)

    var cita = await crearCita({ franja: proximaFranjaLaborable({ hora: 11, minuto: 30 }) })

    var r = await reprogramar(cita.id, { fechaHoraCopia: franjaNueva, idCalendario: slotAjeno.rows[0].id }, tokenCliente)

    expect(r.status).toBe(403)
    var fila = await queryTest('SELECT estado_cita FROM Cita WHERE id = $1', [cita.id])
    expect(fila.rows[0].estado_cita).not.toBe('reprogramada')
  })

  it('INT-REP-04 no se puede reagendar una cita completada o cancelada (409)', async () => {
    var franjaNueva = proximaFranjaLaborable({ hora: 10, minuto: 40 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franjaNueva)
    var cita = await crearCita({ franja: proximaFranjaLaborable({ hora: 11, minuto: 40 }) })

    await queryTest(`UPDATE Cita SET estado_cita = 'completada' WHERE id = $1`, [cita.id])
    var completada = await reprogramar(cita.id, { fechaHoraCopia: franjaNueva, idCalendario: slot.rows[0].id }, tokenCliente)
    expect(completada.status).toBe(409)

    await queryTest(`UPDATE Cita SET estado_cita = 'cancelada' WHERE id = $1`, [cita.id])
    var cancelada = await reprogramar(cita.id, { fechaHoraCopia: franjaNueva, idCalendario: slot.rows[0].id }, tokenCliente)
    expect(cancelada.status).toBe(409)
  })

  it('INT-REP-05 el abogado asignado tambien puede reagendar su propia cita', async () => {
    var franjaNueva = proximaFranjaLaborable({ hora: 10, minuto: 50 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franjaNueva)
    var cita = await crearCita({ franja: proximaFranjaLaborable({ hora: 11, minuto: 50 }) })

    var r = await reprogramar(cita.id, { fechaHoraCopia: franjaNueva, idCalendario: slot.rows[0].id }, tokenAbogado)

    expect(r.status).toBe(200)
    expect(r.body.cita.estadoCita).toBe('reprogramada')
  })

  it('INT-REP-06 el abogado puede aceptar una cita reprogramada y esta pasa a confirmada', async () => {
    var franjaNueva = proximaFranjaLaborable({ hora: 10, minuto: 55 })
    var slot = await insertarSlot(baseIds.abogadoPkId, franjaNueva)
    var cita = await crearCita({ franja: proximaFranjaLaborable({ hora: 11, minuto: 55 }) })

    var reagendada = await reprogramar(cita.id, { fechaHoraCopia: franjaNueva, idCalendario: slot.rows[0].id }, tokenCliente)
    expect(reagendada.status).toBe(200)
    expect(reagendada.body.cita.estadoCita).toBe('reprogramada')

    var acepta = await request(APP)
      .put('/api/citas/' + cita.id + '/aceptar')
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(acepta.status).toBe(200)
    expect(acepta.body.cita.estadoCita).toBe('confirmada')
  })
})