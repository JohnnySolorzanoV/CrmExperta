import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/auth/auth.repositorio.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('auth.repositorio', () => {

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(() => {
    return resetearBasePruebas()
  })

  it('INT-REPO-AUTH-01 buscarPorCorreo retorna null cuando no existe coincidencia', async () => {
    var r = await repo.buscarPorCorreo('x@test.com')
    expect(r).toBeNull()
  })

  it('INT-REPO-AUTH-02 buscarPorIdentificacion retorna la entidad de usuario cuando existe', async () => {
    var ids = await sembrarUsuariosBase()
    var user = await queryTest('SELECT identificacion FROM Usuario WHERE id = $1', [ids.clienteUsuarioId])
    var identificacion = user.rows[0].identificacion
    var r = await repo.buscarPorIdentificacion(identificacion)
    expect(r?.id).toBe(ids.clienteUsuarioId)
    expect(r?.correo).toBe('cliente@test.com')
  })

  it('INT-REPO-AUTH-03 detectarRoles devuelve unicamente los roles registrados para cada usuario', async () => {
    var ids = await sembrarUsuariosBase()
    var rolesAdmin = await repo.detectarRoles(ids.adminUsuarioId)
    var rolesCliente = await repo.detectarRoles(ids.clienteUsuarioId)
    expect(rolesAdmin).toEqual(['administrador'])
    expect(rolesCliente).toEqual(['cliente'])
  })
})
