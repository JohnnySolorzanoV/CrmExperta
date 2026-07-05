import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/casos/caso.repositorio.js'
import { dbPruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('caso.repositorio', () => {
  var ids
  var casoId
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(() => {
    if (!dbLista) return
    return (async () => {
      await resetearBasePruebas()
      ids = await sembrarUsuariosBase()
      var caso = await queryTest(
        `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['abierto', 'civil', 'Caso Repo', ids.clientePkId, ids.abogadoPkId]
      )
      casoId = caso.rows[0].id
    })()
  })

  it('obtenerTodos mapea rows a entidades Caso', async () => {
    if (!dbLista) return
    var r = await repo.obtenerTodos()
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].nombreCaso).toBeTruthy()
  })

  it('buscarPorId retorna null cuando no existe', async () => {
    if (!dbLista) return
    var r = await repo.buscarPorId(999)
    expect(r).toBeNull()
  })

  it('actualizarEstado retorna entidad cuando hay fila', async () => {
    if (!dbLista) return
    var r = await repo.actualizarEstado(casoId, 'cerrado')
    expect(r?.estadoCaso).toBe('cerrado')
  })
})
