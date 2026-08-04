import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase, proximaFranjaLaborable } from '../helpers/dbTestUtils.js'

async function contarAuditoria(accion, recurso) {
  var r = await queryTest(
    'SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE accion = $1 AND recurso = $2',
    [accion, recurso]
  )
  return r.rows[0].n
}

describe('Integracion auditoria persistente', () => {
  var ids
  var tokenCliente
  var tokenAbogado

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenCliente = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
    tokenAbogado = crearTokenTest({ id: ids.abogadoUsuarioId, correo: 'abogado@test.com', roles: ['abogado'] })
  })

  it('AUD-01 el login deja un registro de sesion en auditoria_logs', async () => {
    var r = await request(APP)
      .post('/api/auth/login')
      .send({ correo: 'abogado@test.com', contrasena: ids.passwordPlano })
    expect(r.status).toBe(200)
    var n = await contarAuditoria('LOGIN', 'Sesión')
    expect(n).toBeGreaterThanOrEqual(1)
  })

  it('AUD-02 agendar una cita deja registros de tipo Cita y Notificacion', async () => {
    var fecha = proximaFranjaLaborable()
    var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ idCliente: ids.clienteUsuarioId, idAbogado: ids.abogadoUsuarioId, fechaHoraCopia: fecha, motivo: 'Primera' })
    expect(r.status).toBe(201)

    var citas = await contarAuditoria('CREAR', 'Cita')
    expect(citas).toBeGreaterThanOrEqual(1)

    var notif = await queryTest(
      "SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE accion = 'NOTIFICACION'"
    )
    expect(notif.rows[0].n).toBeGreaterThanOrEqual(1)
  })

  it('AUD-03 los registros de auditoria contienen usuario, recurso e ip', async () => {
var r = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: ids.clienteUsuarioId,
        idAbogado: ids.abogadoUsuarioId,
        fechaHoraCopia: proximaFranjaLaborable(),
        motivo: 'Consulta',
      })
    expect(r.status).toBe(201)

    var fila = await queryTest(
      `SELECT usuario_id, usuario_nombre, accion, recurso, recurso_id, ip
       FROM auditoria_logs WHERE recurso = 'Cita' ORDER BY id DESC LIMIT 1`
    )
    var rec = fila.rows[0]
    expect(Number(rec.usuario_id)).toBe(ids.clienteUsuarioId)
    expect(rec.usuario_nombre).toBeTruthy()
    expect(rec.recurso).toBe('Cita')
    expect(rec.ip).toBeTruthy()
  })
})