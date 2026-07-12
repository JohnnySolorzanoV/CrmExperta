import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { APP } from '../../server.js'

describe('Integracion general de modulos restantes', () => {
  it('INT-GENERAL-01 GET /api/abogados responde 401 cuando no se envia token', async () => {
    var r = await request(APP).get('/api/abogados')
    expect(r.status).toBe(401)
  })

  it('INT-GENERAL-02 POST /api/clientes/registro exige los campos requeridos del formulario', async () => {
    var r = await request(APP)
      .post('/api/clientes/registro')
      .send({ nombre: 'x' })
    expect(r.status).toBe(400)
  })
})
