import request from 'supertest'
import bcrypt from 'bcrypt'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, resetearBasePruebas, sembrarUsuariosBase, queryTest, proximaFranjaLaborable } from '../helpers/dbTestUtils.js'

async function crearAbogadoAdicional() {
  var hash = await bcrypt.hash('Clave123*', 10)
  var u = await queryTest(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['0202000098', 'Abogado Adicional', 'abogadoAdicional@test.com', hash]
  )
  await queryTest(
    `INSERT INTO Abogado (id_usuario, num_licencia, especialidad) VALUES ($1, $2, $3)`,
    [u.rows[0].id, 'MAT-TEST-998', 'Penal']
  )
  return u.rows[0].id
}

describe('Integracion /api/calendario', () => {
  var ids
  var tokenAbogado
  var tokenAdmin

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenAbogado = crearTokenTest({
      id: ids.abogadoUsuarioId,
      correo: 'abogado@test.com',
      roles: ['abogado'],
    })
    tokenAdmin = crearTokenTest({
      id: ids.adminUsuarioId,
      correo: 'admin@test.com',
      roles: ['administrador'],
    })
  })

  it('INT-CALENDARIO-01 GET /api/calendario/abogado/:id/disponibilidad retorna una lista de disponibilidad', async () => {
    var r = await request(APP)
      .get('/api/calendario/abogado/' + ids.abogadoUsuarioId + '/disponibilidad')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.disponibilidad)).toBe(true)
  })

  it('INT-CALENDARIO-02 GET /api/calendario/abogado/:id/disponibilidad serializa fechas en formato ISO UTC', async () => {
    var r = await request(APP)
      .get('/api/calendario/abogado/' + ids.abogadoUsuarioId + '/disponibilidad')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    if (r.body.disponibilidad.length > 0) {
      expect(r.body.disponibilidad[0].fechaEvento).toMatch(/Z$/)
    }
  })

  it('INT-CALENDARIO-03 GET /api/calendario/abogado/:id/disponibilidad acepta id interno por compatibilidad', async () => {
    var r = await request(APP)
      .get('/api/calendario/abogado/' + ids.abogadoPkId + '/disponibilidad')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.disponibilidad)).toBe(true)
  })

  it('INT-CALENDARIO-03b disponibilidad incluye slots de la tarde en Guayaquil (15:00 y 16:00 -> 20:00Z y 21:00Z)', async () => {
    var tarde1 = proximaFranjaLaborable({ hora: 15, minuto: 0 })
    var tarde2 = proximaFranjaLaborable({ hora: 16, minuto: 0 })

    await queryTest(
      `INSERT INTO Calendario (id_abogado, fecha_evento, descripcion)
       VALUES ($1, $2, NULL), ($1, $3, NULL)`,
      [ids.abogadoPkId, tarde1, tarde2]
    )

    var r = await request(APP)
      .get('/api/calendario/abogado/' + ids.abogadoUsuarioId + '/disponibilidad')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    var fechas = r.body.disponibilidad.map((s) => s.fechaEvento)
    // 15:00 y 16:00 en Guayaquil son slots validos de la tarde; deben retornarse
    // (regresion: el filtro EXTRACT(HOUR) usaba horas UTC vs constantes de Guayaquil).
    expect(fechas).toContain(tarde1)
    expect(fechas).toContain(tarde2)
  })

  it('INT-CALENDARIO-04 POST crea el slot a nombre del abogado autenticado', async () => {
    var r = await request(APP)
      .post('/api/calendario')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ fechaEvento: proximaFranjaLaborable({ hora: 11 }), descripcion: 'Consulta' })

    expect(r.status).toBe(201)
    expect(r.body.slot).toBeTruthy()

    var fila = await queryTest('SELECT id_abogado FROM Calendario WHERE id = $1', [r.body.slot.id])
    expect(fila.rows[0].id_abogado).toBe(ids.abogadoPkId)
  })

  it('INT-CALENDARIO-05 POST rechaza con 403 intentar crear un horario para otro abogado', async () => {
    var abogadoAjenoId = await crearAbogadoAdicional()
    var r = await request(APP)
      .post('/api/calendario')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ idAbogado: abogadoAjenoId, fechaEvento: proximaFranjaLaborable({ hora: 11 }), descripcion: 'Otro' })

    expect(r.status).toBe(403)
  })

  it('INT-CALENDARIO-06 DELETE borra solo tus propios slots; un abogado ajeno recibe 403', async () => {
    var propio = await request(APP)
      .post('/api/calendario')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .send({ fechaEvento: proximaFranjaLaborable({ hora: 15 }), descripcion: 'Propio' })
      .expect(201)

    var abogadoAjenoId = await crearAbogadoAdicional()
    var tokenAjeno = crearTokenTest({ id: abogadoAjenoId, correo: 'abogadoAdicional@test.com', roles: ['abogado'] })

    var ajeno = await request(APP)
      .delete('/api/calendario/' + propio.body.slot.id)
      .set('Authorization', 'Bearer ' + tokenAjeno)
    expect(ajeno.status).toBe(403)

    var borrado = await request(APP)
      .delete('/api/calendario/' + propio.body.slot.id)
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(borrado.status).toBe(200)
    expect(borrado.body.mensaje).toBe('Slot eliminado')
  })

  it('INT-CALENDARIO-07 el administrador (sin rol de abogado) no puede crear horarios', async () => {
    var r = await request(APP)
      .post('/api/calendario')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ fechaEvento: proximaFranjaLaborable({ hora: 15 }), descripcion: 'Admin' })
    expect(r.status).toBe(403)
  })
})
