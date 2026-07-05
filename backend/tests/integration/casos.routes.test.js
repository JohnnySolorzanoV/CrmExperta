import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { dbPruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/casos', () => {
  var baseIds
  var tokenAbogado
  var casoId
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()
    tokenAbogado = crearTokenTest({
      id: baseIds.abogadoUsuarioId,
      correo: 'abogado@test.com',
      roles: ['abogado'],
    })

    var nuevoCaso = await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['abierto', 'civil', 'Caso Integracion', baseIds.clientePkId, baseIds.abogadoPkId]
    )
    casoId = nuevoCaso.rows[0].id
  })

  it('PUT /api/casos/:id/estado actualiza estado valido', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'en_proceso' })

    expect(r.status).toBe(200)
    expect(r.body.caso?.estadoCaso).toBe('en_proceso')
  })

  it('PUT /api/casos/:id/estado rechaza estado invalido', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'estado_fake' })

    expect(r.status).toBe(400)
    expect(r.body.error).toBe('Estado invalido')
  })
})
