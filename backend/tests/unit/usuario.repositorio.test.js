import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/usuarios/usuario.repositorio.js'
import { dbPruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('usuario.repositorio', () => {
  var ids
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(() => {
    if (!dbLista) return
    return (async () => {
      await resetearBasePruebas()
      ids = await sembrarUsuariosBase()
    })()
  })

  it('obtenerTodos mapea usuarios', async () => {
    if (!dbLista) return
    var r = await repo.obtenerTodos()
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].correo).toBeTruthy()
  })

  it('eliminar retorna true si rowCount > 0', async () => {
    if (!dbLista) return
    var ok = await repo.eliminar(ids.clienteUsuarioId)
    expect(ok).toBe(true)
  })

  it('obtenerRoles incluye solo roles encontrados', async () => {
    if (!dbLista) return
    var r = await repo.obtenerRoles(ids.abogadoUsuarioId)
    expect(r).toEqual(['abogado'])
  })
})
