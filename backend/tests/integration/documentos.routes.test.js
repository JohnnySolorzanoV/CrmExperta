import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { dbPruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/documentos', () => {
  var ids
  var tokenAbogado
  var casoId
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenAbogado = crearTokenTest({
      id: ids.abogadoUsuarioId,
      correo: 'abogado@test.com',
      roles: ['abogado'],
    })
    var caso = await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['abierto', 'civil', 'Caso Docs API', ids.clientePkId, ids.abogadoPkId]
    )
    casoId = caso.rows[0].id
  })

  it('INT-DOCUMENTOS-01 POST /api/documentos crea un documento valido asociado al caso', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({
        idCaso: casoId,
        nombreDocumento: 'demanda.pdf',
        extension: 'pdf',
        descripcion: 'Demanda inicial',
      })

    expect(r.status).toBe(201)
    expect(r.body.documento?.idCaso).toBe(casoId)
  })
})
