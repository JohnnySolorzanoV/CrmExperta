import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { APP } from '../../server.js'

describe('Integracion general de modulos restantes', () => {
  it('GET /api/abogados sin token responde 401', async () => {
    var r = await request(APP).get('/api/abogados')
    expect(r.status).toBe(401)
  })

  it('POST /api/clientes/registro valida campos requeridos', async () => {
    var r = await request(APP)
      .post('/api/clientes/registro')
      .send({ nombre: 'x' })
    expect(r.status).toBe(400)
  })
})
