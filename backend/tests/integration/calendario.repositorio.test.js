import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/calendario/calendario.repositorio.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('calendario.repositorio', () => {
  var ids
  var slotId

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    var slot = await queryTest(
      'INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, $3) RETURNING id',
      [ids.abogadoPkId, '2026-08-03T09:00:00.000Z', 'Slot repo calendario']
    )
    slotId = slot.rows[0].id
  })

  it('INT-REPO-CALENDARIO-01 buscarPorId retorna el slot cuando existe y null en caso contrario', async () => {
    var ok = await repo.buscarPorId(slotId)
    var no = await repo.buscarPorId(99999)
    expect(ok?.id).toBe(slotId)
    expect(no).toBeNull()
  })
})
