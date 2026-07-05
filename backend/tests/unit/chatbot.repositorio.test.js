import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/chatbot/chatbot.repositorio.js'
import { dbPruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('chatbot.repositorio', () => {
  var dbLista = true
  var ids

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
  })

  it('crear y obtenerHistorial funcionan para usuario', async () => {
    if (!dbLista) return
    await repo.crear({
      idUsuario: ids.clienteUsuarioId,
      chatLog: JSON.stringify({ pregunta: 'hola', respuesta: 'ok' }),
    })
    var h = await repo.obtenerHistorial(ids.clienteUsuarioId)
    expect(h.length).toBeGreaterThan(0)
    expect(h[0].idUsuario).toBe(ids.clienteUsuarioId)
  })
})
