import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as repo from '../../modulos/documentos/documento.repositorio.js'
import { dbPruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('documento.repositorio', () => {
  var dbLista = true
  var casoId

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    var ids = await sembrarUsuariosBase()
    var caso = await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['abierto', 'civil', 'Caso Docs', ids.clientePkId, ids.abogadoPkId]
    )
    casoId = caso.rows[0].id
  })

  it('crear y buscarPorId retorna documento', async () => {
    if (!dbLista) return
    var creado = await repo.crear({
      idCaso: casoId,
      nombreDocumento: 'escrito.pdf',
      descripcion: 'prueba',
      extension: 'pdf',
      rutaArchivo: '/uploads/escrito.pdf',
      tamaño: 1000,
    })
    var doc = await repo.buscarPorId(creado.id)
    expect(doc?.idCaso).toBe(casoId)
    expect(doc?.extension).toBe('pdf')
  })
})
