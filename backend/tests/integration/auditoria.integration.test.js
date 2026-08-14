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

// Las notificaciones se envían en segundo plano (fire-and-forget) después de la
// respuesta; se espera un breve instante para que su inserción termine.
async function esperarNotificaciones() {
  for (var i = 0; i < 30; i++) {
    var notif = await queryTest(
      "SELECT COUNT(*)::int AS n FROM auditoria_logs WHERE accion = 'NOTIFICACION'"
    )
    if (notif.rows[0].n > 0) return notif.rows[0].n
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return 0
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

    var notif = await esperarNotificaciones()
    expect(notif).toBeGreaterThanOrEqual(1)
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
    expect(rec.recurso_id).toBeTruthy()
    expect(rec.ip).toBeTruthy()
  })

  it('AUD-04 cada consulta al chatbot deja CONSULTAR/Chatbot con consultaId', async () => {
    var r = await request(APP)
      .post('/api/chatbot/consultar')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ mensaje: 'Necesito asesoría por un contrato' })
    expect(r.status).toBe(200)
    expect(r.body.consultaId).toBeTruthy()

    var fila = await queryTest(
      `SELECT accion, recurso, recurso_id, detalle FROM auditoria_logs
       WHERE accion = 'CONSULTAR' AND recurso = 'Chatbot' ORDER BY id DESC LIMIT 1`
    )
    expect(fila.rows[0]).toBeTruthy()
    expect(Number(fila.rows[0].recurso_id)).toBe(r.body.consultaId)
    expect(fila.rows[0].detalle).toContain('pregunta:')
  })

  it('AUD-05 agendar desde chatbot deja CREAR/Cita', async () => {
    var r = await request(APP)
      .post('/api/chatbot/agendar')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idAbogado: ids.abogadoUsuarioId,
        resumen: 'Consulta legal desde el chat',
        motivo: 'Contrato',
        fechaHoraCopia: proximaFranjaLaborable(),
      })
    expect(r.status).toBe(201)

    var fila = await queryTest(
      `SELECT accion, recurso, recurso_id, detalle FROM auditoria_logs
       WHERE accion = 'CREAR' AND recurso = 'Cita' ORDER BY id DESC LIMIT 1`
    )
    expect(Number(fila.rows[0].recurso_id)).toBe(r.body.cita.id)
    expect(fila.rows[0].detalle).toContain('chatbot')
  })

  it('AUD-06 la solicitud de recuperacion de contraseña queda auditada', async () => {
    var r = await request(APP)
      .post('/api/auth/recuperar-contrasena')
      .send({ correo: 'cliente@test.com' })
    expect(r.status).toBe(200)
    expect(await contarAuditoria('RECUPERAR_CONTRASENA', 'Usuario')).toBeGreaterThanOrEqual(1)
  })

  it('AUD-07 subir, descargar y eliminar un documento dejan recurso_id y nombre', async () => {
    var caso = await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['abierto', 'civil', 'Caso auditoria docs', ids.clientePkId, ids.abogadoPkId]
    )
    var casoId = caso.rows[0].id

    var up = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', String(casoId))
      .attach('archivo', Buffer.from('%PDF-1.4 evidencia'), 'evidencia.pdf')
    expect(up.status).toBe(201)
    var docId = up.body.documento.id

    var subida = await queryTest(
      `SELECT recurso_id, detalle FROM auditoria_logs
       WHERE accion = 'CREAR' AND recurso = 'Documento' ORDER BY id DESC LIMIT 1`
    )
    expect(Number(subida.rows[0].recurso_id)).toBe(docId)
    expect(subida.rows[0].detalle).toContain('evidencia.pdf')

    var dl = await request(APP)
      .get('/api/documentos/' + docId + '/descargar')
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(dl.status).toBe(200)
    expect(await contarAuditoria('DESCARGAR', 'Documento')).toBeGreaterThanOrEqual(1)

    var del = await request(APP)
      .delete('/api/documentos/' + docId)
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(del.status).toBe(200)
    var baja = await queryTest(
      `SELECT recurso_id, detalle FROM auditoria_logs
       WHERE accion = 'ELIMINAR' AND recurso = 'Documento' ORDER BY id DESC LIMIT 1`
    )
    expect(Number(baja.rows[0].recurso_id)).toBe(docId)
    expect(baja.rows[0].detalle).toContain('evidencia.pdf')
  })

  it('AUD-08 un cambio de estado de caso incluye recurso_id y transicion', async () => {
    var caso = await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['abierto', 'civil', 'Caso estado', ids.clientePkId, ids.abogadoPkId]
    )
    var r = await request(APP)
      .put('/api/casos/' + caso.rows[0].id + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'en_proceso' })
    expect(r.status).toBe(200)

    var fila = await queryTest(
      `SELECT recurso_id, detalle FROM auditoria_logs
       WHERE accion = 'MODIFICAR' AND recurso = 'Caso' ORDER BY id DESC LIMIT 1`
    )
    expect(Number(fila.rows[0].recurso_id)).toBe(caso.rows[0].id)
    expect(fila.rows[0].detalle).toContain('abierto')
    expect(fila.rows[0].detalle).toContain('en_proceso')
  })

  it('AUD-09 cancelar una cita y cerrar sesion dejan rastro con recurso_id', async () => {
    var agendada = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: ids.clienteUsuarioId,
        idAbogado: ids.abogadoUsuarioId,
        fechaHoraCopia: proximaFranjaLaborable(),
        motivo: 'Cancelable',
      })
    expect(agendada.status).toBe(201)
    var citaId = agendada.body.cita.id

    var cancel = await request(APP)
      .put('/api/citas/' + citaId + '/cancelar')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ motivoCancelacion: 'Cambio de planes' })
    expect(cancel.status).toBe(200)

    var fila = await queryTest(
      `SELECT recurso_id, detalle FROM auditoria_logs
       WHERE accion = 'MODIFICAR' AND recurso = 'Cita' AND detalle LIKE '%cancelacion%'
       ORDER BY id DESC LIMIT 1`
    )
    expect(Number(fila.rows[0].recurso_id)).toBe(citaId)
    expect(fila.rows[0].detalle).toContain('cancelada')

    var logout = await request(APP)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(logout.status).toBe(200)
    expect(await contarAuditoria('CERRAR_SESION', 'Sesión')).toBeGreaterThanOrEqual(1)
  })

  it('AUD-10 el registro de cliente deja usuario_id y usuario_nombre del nuevo cliente', async () => {
    var r = await request(APP)
      .post('/api/clientes/registro')
      .send({
        identificacion: '0101999888',
        nombre: 'Ana Registro',
        correo: 'ana.registro@test.com',
        contrasena: 'Clave123*',
        direccion: 'Calle 1',
        telefono: '0991112222',
      })
    expect(r.status).toBe(201)
    var usuarioId = r.body.usuario.id

    var fila = await queryTest(
      `SELECT usuario_id, usuario_nombre, accion, recurso, recurso_id
       FROM auditoria_logs WHERE accion = 'CREAR' AND recurso = 'Cliente' ORDER BY id DESC LIMIT 1`
    )
    expect(Number(fila.rows[0].usuario_id)).toBe(usuarioId)
    expect(fila.rows[0].usuario_nombre).toBe('Ana Registro')
    expect(Number(fila.rows[0].recurso_id)).toBe(usuarioId)
  })

  it('AUD-11 un registro de cliente fallido guarda el nombre enviado y no deja usuario vacio', async () => {
    var r = await request(APP)
      .post('/api/clientes/registro')
      .send({
        identificacion: '0101000001',
        nombre: 'Cliente Duplicado',
        correo: 'cliente@test.com',
        contrasena: 'Clave123*',
      })
    expect(r.status).toBe(400)

    var fila = await queryTest(
      `SELECT usuario_nombre, accion, recurso, resultado, detalle
       FROM auditoria_logs WHERE resultado = 'fallido' ORDER BY id DESC LIMIT 1`
    )
    expect(fila.rows[0].usuario_nombre).toBe('Cliente Duplicado')
    expect(fila.rows[0].detalle).toMatch(/correo|identificacion/i)
  })
})