import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { APP } from '../../server.js'

describe('Integracion salud y disponibilidad', () => {
  it('H-01 GET /api/health responde 200 con estado ok', async () => {
    var r = await request(APP).get('/api/health')
    expect(r.status).toBe(200)
    expect(r.body.estado).toBe('ok')
    expect(r.body.timestamp).toBeTruthy()
  })

  it('H-02 GET /api/ready responde 200 con base de datos ok cuando esta operativa', async () => {
    var r = await request(APP).get('/api/ready')
    expect(r.status).toBe(200)
    expect(r.body.baseDatos).toBe('ok')
  })
})