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

  it('INT-CASOS-01 PUT /api/casos/:id/estado actualiza el estado cuando se envia un valor valido', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'en_proceso' })

    expect(r.status).toBe(200)
    expect(r.body.caso?.estadoCaso).toBe('en_proceso')
  })

  it('INT-CASOS-02 PUT /api/casos/:id/estado rechaza estados fuera del catalogo permitido', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'estado_fake' })

    expect(r.status).toBe(400)
    expect(r.body.error).toBe('Estado invalido')
  })

  it('INT-CASOS-03 PUT /api/casos/:id/notas-conclusiones persiste notas y conclusiones con payload valido', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/notas-conclusiones')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ notas: '  Nota legal importante  ', conclusiones: '  Cierre favorable  ' })

    expect(r.status).toBe(200)
    expect(r.body.mensaje).toBe('Notas y conclusiones actualizadas')
    expect(r.body.caso?.notas).toBe('Nota legal importante')
    expect(r.body.caso?.conclusiones).toBe('Cierre favorable')
  })

  it('INT-CASOS-04 PUT /api/casos/:id/notas-conclusiones rechaza payload no textual para notas o conclusiones', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/notas-conclusiones')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ notas: 123, conclusiones: {} })

    expect(r.status).toBe(400)
    expect(r.body.error).toBe('Notas y conclusiones deben ser texto')
  })

  it('INT-CASOS-05 PUT /api/casos/:id/notas-conclusiones normaliza valores faltantes a cadenas vacias', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/notas-conclusiones')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({})

    expect(r.status).toBe(200)
    expect(r.body.caso?.notas).toBe('')
    expect(r.body.caso?.conclusiones).toBe('')
  })

  it('INT-CASOS-06 PUT /api/casos/:id/notas-conclusiones responde 404 cuando el caso no existe', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .put('/api/casos/999999/notas-conclusiones')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ notas: 'N', conclusiones: 'C' })

    expect(r.status).toBe(404)
    expect(r.body.error).toBe('Caso no encontrado')
  })
})
