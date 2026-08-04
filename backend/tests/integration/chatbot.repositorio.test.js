import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/chatbot/chatbot.repositorio.js'
import { verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('chatbot.repositorio', () => {
  var ids

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
  })

  it('INT-REPO-CHATBOT-01 crear y obtenerHistorial almacenan y recuperan conversaciones por usuario', async () => {
    await repo.crear({
      idUsuario: ids.clienteUsuarioId,
      chatLog: JSON.stringify({ pregunta: 'hola', respuesta: 'ok' }),
    })
    var h = await repo.obtenerHistorial(ids.clienteUsuarioId)
    expect(h.length).toBeGreaterThan(0)
    expect(h[0].idUsuario).toBe(ids.clienteUsuarioId)
  })
})
