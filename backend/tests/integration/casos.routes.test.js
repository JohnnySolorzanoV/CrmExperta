import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase, proximaFranjaLaborable } from '../helpers/dbTestUtils.js'

describe('Integracion /api/casos', () => {
  var baseIds
  var tokenAbogado
  var casoId

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    baseIds = await sembrarUsuariosBase()
    tokenAbogado = crearTokenTest({
      id: baseIds.abogadoUsuarioId,
      correo: 'abogado@test.com',
      roles: ['abogado'],
    })

    var nuevoCaso = await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['abierto', 'civil', 'Caso Integracion', baseIds.clientePkId, baseIds.abogadoPkId]
    )
    casoId = nuevoCaso.rows[0].id
  })

  it('INT-CASOS-01 PUT /api/casos/:id/estado actualiza el estado cuando se envia un valor valido', async () => {
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'en_proceso' })

    expect(r.status).toBe(200)
    expect(r.body.caso?.estadoCaso).toBe('en_proceso')
  })

  it('INT-CASOS-02 PUT /api/casos/:id/estado rechaza estados fuera del catalogo permitido', async () => {
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'estado_fake' })

    expect(r.status).toBe(400)
    expect(r.body.error).toBe('Estado invalido')
  })

  it('INT-CASOS-03 PUT /api/casos/:id/notas-conclusiones persiste notas y conclusiones con payload valido', async () => {
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/notas-conclusiones')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ notas: '  Nota legal importante  ', conclusiones: '  Cierre favorable  ' })

    expect(r.status).toBe(200)
    expect(r.body.mensaje).toBe('Notas y conclusiones actualizadas')
    expect(r.body.caso?.notas).toBe('Nota legal importante')
    expect(r.body.caso?.conclusiones).toBe('Cierre favorable')
  })

  it('INT-CASOS-04 PUT /api/casos/:id/notas-conclusiones rechaza payload no textual para notas o conclusiones', async () => {
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/notas-conclusiones')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ notas: 123, conclusiones: {} })

    expect(r.status).toBe(400)
    expect(r.body.error).toBe('Notas y conclusiones deben ser texto')
  })

  it('INT-CASOS-05 PUT /api/casos/:id/notas-conclusiones normaliza valores faltantes a cadenas vacias', async () => {
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/notas-conclusiones')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({})

    expect(r.status).toBe(200)
    expect(r.body.caso?.notas).toBe('')
    expect(r.body.caso?.conclusiones).toBe('')
  })

  it('INT-CASOS-06 PUT /api/casos/:id/notas-conclusiones responde 404 cuando el caso no existe', async () => {
    var r = await request(APP)
      .put('/api/casos/999999/notas-conclusiones')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ notas: 'N', conclusiones: 'C' })

    expect(r.status).toBe(404)
    expect(r.body.error).toBe('Caso no encontrado')
  })

  it('INT-CASOS-07 rechaza transiciones no permitidas (abierto no puede saltar a archivado)', async () => {
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'archivado' })

    expect(r.status).toBe(400)
    expect(r.body.error).toContain('Transicion no permitida')
  })

  it('INT-CASOS-08 rechaza actualizar al mismo estado actual', async () => {
    var r = await request(APP)
      .put('/api/casos/' + casoId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ estado: 'abierto' })

    expect(r.status).toBe(409)
    expect(r.body.error).toContain('ya se encuentra en ese estado')
  })

  it('INT-CASOS-09 crear un caso desde una cita confirmada la deja completada', async () => {
    var franja = proximaFranjaLaborable({ hora: 10, minuto: 40 })
    var tokenCliente = crearTokenTest({
      id: baseIds.clienteUsuarioId,
      correo: 'cliente@test.com',
      roles: ['cliente'],
    })

    var agendada = await request(APP)
      .post('/api/citas')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        fechaHoraCopia: franja,
        motivo: 'Consulta para expediente',
      })
    expect(agendada.status).toBe(201)
    var citaId = agendada.body.cita.id

    var acepta = await request(APP)
      .put('/api/citas/' + citaId + '/aceptar')
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(acepta.status).toBe(200)

    var creado = await request(APP)
      .post('/api/casos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({
        nombreCaso: 'Expediente desde cita',
        tipoCaso: 'civil',
        estadoCaso: 'abierto',
        idCliente: baseIds.clienteUsuarioId,
        idAbogado: baseIds.abogadoUsuarioId,
        idCita: citaId,
      })
    expect(creado.status).toBe(201)

    var cita = await queryTest('SELECT estado_cita FROM Cita WHERE id = $1', [citaId])
    expect(cita.rows[0].estado_cita).toBe('completada')
  })
})
