import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase, proximaFranjaLaborable } from '../helpers/dbTestUtils.js'

describe('Integracion /api/chatbot', () => {
  var ids
  var tokenCliente

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
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

  it('INT-CHATBOT-01 GET /api/chatbot/historial/:idUsuario retorna el historial del usuario autenticado', async () => {
    var r = await request(APP)
      .get('/api/chatbot/historial/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)

    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.historial)).toBe(true)
  })

  it('INT-CHATBOT-02 POST /api/chatbot/agendar crea la cita para el cliente autenticado (idCliente ajeno se ignora)', async () => {
    var r = await request(APP)
      .post('/api/chatbot/agendar')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: ids.abogadoUsuarioId,
        idAbogado: ids.abogadoUsuarioId,
        resumen: 'Cliente solicita agendar una consulta legal',
        motivo: 'Consulta por chat',
        fechaHoraCopia: proximaFranjaLaborable(),
      })

    expect(r.status).toBe(201)
    expect(r.body.cita.idCliente).toBe(ids.clientePkId)

    var fila = await queryTest('SELECT id_cliente FROM Cita WHERE id = $1', [r.body.cita.id])
    expect(fila.rows[0].id_cliente).toBe(ids.clientePkId)
  })
})
