import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase, proximaFranjaLaborable } from '../helpers/dbTestUtils.js'

describe('Integracion doble reserva concurrente', () => {
  var ids
  var tokenCliente

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenCliente = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
  })

  it('DB-01 dos solicitudes simultaneas al mismo horario producen una reserva y un rechazo', async () => {
    var fecha = proximaFranjaLaborable({ hora: 10, minuto: 15 })
    var cuerpo = {
      idCliente: ids.clienteUsuarioId,
      idAbogado: ids.abogadoUsuarioId,
      fechaHoraCopia: fecha,
      motivo: 'Cita simultanea',
    }

    var [r1, r2] = await Promise.all([
      request(APP).post('/api/citas').set('Authorization', 'Bearer ' + tokenCliente).send(cuerpo),
      request(APP).post('/api/citas').set('Authorization', 'Bearer ' + tokenCliente).send(cuerpo),
    ])

    var estados = [r1.status, r2.status].sort()
    expect(estados).toEqual([201, 409])

    var fila = await queryTest(
      `SELECT COUNT(*)::int AS n FROM Cita
       WHERE id_abogado = $1 AND EXTRACT(EPOCH FROM (date_trunc('hour', fecha_hora_copia))) = EXTRACT(EPOCH FROM date_trunc('hour', $2::timestamp))`,
      [ids.abogadoPkId, fecha]
    )
    expect(fila.rows[0].n).toBe(1)
  })
})