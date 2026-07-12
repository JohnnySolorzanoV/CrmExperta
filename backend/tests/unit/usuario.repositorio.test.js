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

  it('UNIT-USUARIOS-01 obtenerTodos mapea correctamente las filas a entidades de usuario', async () => {
    if (!dbLista) return
    var r = await repo.obtenerTodos()
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].correo).toBeTruthy()
  })

  it('UNIT-USUARIOS-02 eliminar retorna true cuando se elimina al menos un registro', async () => {
    if (!dbLista) return
    var ok = await repo.eliminar(ids.clienteUsuarioId)
    expect(ok).toBe(true)
  })

  it('UNIT-USUARIOS-03 obtenerRoles devuelve solo los roles realmente presentes', async () => {
    if (!dbLista) return
    var r = await repo.obtenerRoles(ids.abogadoUsuarioId)
    expect(r).toEqual(['abogado'])
  })
})
