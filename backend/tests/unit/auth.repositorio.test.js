import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/auth/auth.repositorio.js'
import { dbPruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('auth.repositorio', () => {
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(() => {
    if (!dbLista) return
    return resetearBasePruebas()
  })

  it('buscarPorCorreo retorna null si no hay filas', async () => {
    if (!dbLista) return
    var r = await repo.buscarPorCorreo('x@test.com')
    expect(r).toBeNull()
  })

  it('buscarPorIdentificacion retorna Usuario cuando existe', async () => {
    if (!dbLista) return
    var ids = await sembrarUsuariosBase()
    var user = await queryTest('SELECT identificacion FROM Usuario WHERE id = $1', [ids.clienteUsuarioId])
    var identificacion = user.rows[0].identificacion
    var r = await repo.buscarPorIdentificacion(identificacion)
    expect(r?.id).toBe(ids.clienteUsuarioId)
    expect(r?.correo).toBe('cliente@test.com')
  })

  it('detectarRoles acumula roles encontrados', async () => {
    if (!dbLista) return
    var ids = await sembrarUsuariosBase()
    var rolesAdmin = await repo.detectarRoles(ids.adminUsuarioId)
    var rolesCliente = await repo.detectarRoles(ids.clienteUsuarioId)
    expect(rolesAdmin).toEqual(['administrador'])
    expect(rolesCliente).toEqual(['cliente'])
  })
})
