import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { dbPruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/usuarios', () => {
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    await sembrarUsuariosBase()
  })

  it('GET /api/usuarios lista usuarios', async () => {
    if (!dbLista) return
    var r = await request(APP).get('/api/usuarios')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.usuarios)).toBe(true)
  })
})
