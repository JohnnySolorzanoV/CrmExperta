import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { dbPruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/calendario', () => {
  var ids
  var tokenAbogado
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
  })

  it('INT-CALENDARIO-01 GET /api/calendario/abogado/:id/disponibilidad retorna una lista de disponibilidad', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .get('/api/calendario/abogado/' + ids.abogadoUsuarioId + '/disponibilidad')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.disponibilidad)).toBe(true)
  })

  it('INT-CALENDARIO-02 GET /api/calendario/abogado/:id/disponibilidad serializa fechas en formato ISO UTC', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .get('/api/calendario/abogado/' + ids.abogadoUsuarioId + '/disponibilidad')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    if (r.body.disponibilidad.length > 0) {
      expect(r.body.disponibilidad[0].fechaEvento).toMatch(/Z$/)
    }
  })

  it('INT-CALENDARIO-03 GET /api/calendario/abogado/:id/disponibilidad acepta id interno por compatibilidad', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .get('/api/calendario/abogado/' + ids.abogadoPkId + '/disponibilidad')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.disponibilidad)).toBe(true)
  })
})
