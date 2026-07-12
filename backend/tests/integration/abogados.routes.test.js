import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { dbPruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/abogados', () => {
  var baseIds
  var tokenAdmin
  var dbLista = true

  beforeAll(async () => {
    dbLista = await dbPruebasDisponible()
  })

  beforeEach(async () => {
    if (!dbLista) return
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()
    tokenAdmin = crearTokenTest({
      id: baseIds.adminUsuarioId,
      correo: 'admin@test.com',
      roles: ['administrador'],
    })
  })

  it('INT-ABOGADOS-01 DELETE /api/abogados/:id bloquea la eliminacion cuando existen casos asignados', async () => {
    if (!dbLista) return

    await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5)`,
      ['abierto', 'civil', 'Caso con dependencia', baseIds.clientePkId, baseIds.abogadoPkId]
    )

    var r = await request(APP)
      .delete('/api/abogados/' + baseIds.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAdmin)

    expect(r.status).toBe(409)
    expect(r.body.error).toBe('No se puede eliminar el abogado porque tiene casos asignados')
  })

  it('INT-ABOGADOS-02 DELETE /api/abogados/:id bloquea la eliminacion cuando hay citas activas programadas', async () => {
    if (!dbLista) return

    await queryTest(
      `INSERT INTO Cita (id_cliente, id_abogado, fecha_hora_copia, motivo, estado_cita)
       VALUES ($1, $2, $3, $4, $5)`,
      [baseIds.clientePkId, baseIds.abogadoPkId, '2026-08-02T10:00:00.000Z', 'Consulta activa', 'pendiente']
    )

    var r = await request(APP)
      .delete('/api/abogados/' + baseIds.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAdmin)

    expect(r.status).toBe(409)
    expect(r.body.error).toBe('No se puede eliminar el abogado porque tiene citas activas programadas')
  })

  it('INT-ABOGADOS-03 DELETE /api/abogados/:id permite eliminar cuando solo existen citas cerradas', async () => {
    if (!dbLista) return

    await queryTest(
      `INSERT INTO Cita (id_cliente, id_abogado, fecha_hora_copia, motivo, estado_cita)
       VALUES ($1, $2, $3, $4, $5)`,
      [baseIds.clientePkId, baseIds.abogadoPkId, '2026-08-02T11:00:00.000Z', 'Consulta cancelada', 'cancelada']
    )

    await queryTest(
      `INSERT INTO Cita (id_cliente, id_abogado, fecha_hora_copia, motivo, estado_cita)
       VALUES ($1, $2, $3, $4, $5)`,
      [baseIds.clientePkId, baseIds.abogadoPkId, '2026-08-02T12:00:00.000Z', 'Consulta completada', 'completada']
    )

    var r = await request(APP)
      .delete('/api/abogados/' + baseIds.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenAdmin)

    expect(r.status).toBe(200)
    expect(r.body.mensaje).toBe('Abogado eliminado')

    var abogadoEliminado = await queryTest('SELECT id FROM Abogado WHERE id_usuario = $1', [baseIds.abogadoUsuarioId])
    var usuarioEliminado = await queryTest('SELECT id FROM Usuario WHERE id = $1', [baseIds.abogadoUsuarioId])
    expect(abogadoEliminado.rows.length).toBe(0)
    expect(usuarioEliminado.rows.length).toBe(0)
  })
})
