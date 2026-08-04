import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/citas/cita.repositorio.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('cita.repositorio', () => {
  var ids
  var citaId
  var calendarioId

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(() => {
    return (async () => {
      await resetearBasePruebas()
      ids = await sembrarUsuariosBase()
      var cal = await queryTest(
        'INSERT INTO Calendario (id_abogado, fecha_evento, descripcion) VALUES ($1, $2, $3) RETURNING id',
        [ids.abogadoPkId, '2026-08-01T10:00:00.000Z', 'Slot test']
      )
      calendarioId = cal.rows[0].id

      var cita = await queryTest(
        `INSERT INTO Cita (id_cliente, id_abogado, fecha_hora_copia, id_calendario, motivo, estado_cita)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [ids.clientePkId, ids.abogadoPkId, '2026-08-01T10:15:00.000Z', calendarioId, 'Repo test', 'pendiente']
      )
      citaId = cita.rows[0].id
    })()
  })

  it('INT-REPO-CITAS-01 buscarPorId retorna null cuando la cita no existe', async () => {
    var r = await repo.buscarPorId(100)
    expect(r).toBeNull()
  })

  it('INT-REPO-CITAS-02 slotOcupado retorna true cuando existe una cita activa asociada al slot', async () => {
    var r = await repo.slotOcupado(calendarioId)
    expect(r).toBe(true)
  })

  it('INT-REPO-CITAS-03 existeConflictoAbogado permite excluir la cita actual en una reprogramacion', async () => {
    var sinExcluir = await repo.existeConflictoAbogado(ids.abogadoPkId, '2026-08-01T10:50:00.000Z')
    var excluyendo = await repo.existeConflictoAbogado(ids.abogadoPkId, '2026-08-01T10:50:00.000Z', citaId)
    expect(sinExcluir).toBe(true)
    expect(excluyendo).toBe(false)
  })

  it('INT-REPO-CITAS-04 eliminar retorna false cuando no se afecta ningun registro', async () => {
    var r = await repo.eliminar(888888)
    expect(r).toBe(false)
  })
})
