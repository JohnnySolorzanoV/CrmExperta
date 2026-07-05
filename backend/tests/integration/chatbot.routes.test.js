import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { dbPruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/chatbot', () => {
  var ids
  var tokenCliente
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenCliente = crearTokenTest({
      id: ids.clienteUsuarioId,
      correo: 'cliente@test.com',
      roles: ['cliente'],
    })

    await queryTest(
      'INSERT INTO Chatbot (id_usuario, chat_log) VALUES ($1, $2)',
      [ids.clienteUsuarioId, JSON.stringify({ pregunta: 'hola', respuesta: 'ok' })]
    )
  })

  it('GET /api/chatbot/historial/:idUsuario retorna historial', async () => {
    if (!dbLista) return
    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)

    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.historial)).toBe(true)
  })
})
