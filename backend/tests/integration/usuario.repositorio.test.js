import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/usuarios/usuario.repositorio.js'
import { verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('usuario.repositorio', () => {
  var ids

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(() => {
    return (async () => {
      await resetearBasePruebas()
      ids = await sembrarUsuariosBase()
    })()
  })

  it('INT-REPO-USUARIOS-01 obtenerTodos mapea correctamente las filas a entidades de usuario', async () => {
    var r = await repo.obtenerTodos()
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].correo).toBeTruthy()
  })

  it('INT-REPO-USUARIOS-02 eliminar retorna true cuando se elimina al menos un registro', async () => {
    var ok = await repo.eliminar(ids.clienteUsuarioId)
    expect(ok).toBe(true)
  })

  it('INT-REPO-USUARIOS-03 obtenerRoles devuelve solo los roles realmente presentes', async () => {
    var r = await repo.obtenerRoles(ids.abogadoUsuarioId)
    expect(r).toEqual(['abogado'])
  })
})
