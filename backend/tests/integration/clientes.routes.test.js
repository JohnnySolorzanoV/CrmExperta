import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/clientes', () => {
  var ids
  var tokenAdmin
  var tokenCliente

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    ids = await sembrarUsuariosBase()
    tokenAdmin = crearTokenTest({ id: ids.adminUsuarioId, correo: 'admin@test.com', roles: ['administrador'] })
    tokenCliente = crearTokenTest({ id: ids.clienteUsuarioId, correo: 'cliente@test.com', roles: ['cliente'] })
  })

  it('RF01-01 registro exitoso no devuelve la contrasena en la respuesta', async () => {
    var r = await request(APP)
      .post('/api/clientes/registro')
      .send({ identificacion: '0104000004', nombre: 'Nuevo', correo: 'nuevo@test.com', contrasena: 'Clave123*', direccion: 'Q', telefono: '0991' })
    expect(r.status).toBe(201)
    expect(r.body.usuario.id).toBeTruthy()
    expect(JSON.stringify(r.body)).not.toContain('Clave123*')
    expect(r.body.usuario.contrasena).toBeUndefined()
  })

  it('RF01-002 registro rechaza correo duplicado', async () => {
    var r = await request(APP)
      .post('/api/clientes/registro')
      .send({ identificacion: '0102000002', nombre: 'X', correo: 'cliente@test.com', contrasena: 'Clave123*' })
    expect(r.status).toBe(400)
    expect(r.body.error).toContain('correo ya esta registrado')
  })

  it('RF01-03 registro rechaza identificacion duplicada', async () => {
    var r = await request(APP)
      .post('/api/clientes/registro')
      .send({ identificacion: '0101000001', nombre: 'X', correo: 'otro@test.com', contrasena: 'Clave123*' })
    expect(r.status).toBe(400)
    expect(r.body.error).toContain('identificacion ya esta registrada')
  })

  it('RF01-04 la contrasena se guarda cifrada (hash bcrypt) y no como texto plano', async () => {
    await request(APP)
      .post('/api/clientes/registro')
      .send({ identificacion: 'N9', nombre: 'Cifrado', correo: 'cifrado@test.com', contrasena: 'Clave123*' })

    var fila = await queryTest("SELECT contrasena FROM Usuario WHERE correo = 'cifrado@test.com'")
    var stored = fila.rows[0].contrasena
    expect(stored).not.toBe('Clave123*')
    expect(stored.startsWith('$2')).toBe(true)
  })

  it('RF01-05 la alta es transaccional: Usuario y Cliente se crean a la vez', async () => {
    var r = await request(APP).post('/api/clientes/registro').send({
      identificacion: 'T9', nombre: 'Tx', correo: 'tx@test.com', contrasena: 'Clave123*',
    })
    expect(r.status).toBe(201)
    var usu = await queryTest("SELECT id FROM Usuario WHERE correo = 'tx@test.com'")
    var cli = await queryTest('SELECT id FROM Cliente WHERE id_usuario = $1', [usu.rows[0].id])
    expect(usu.rows.length).toBe(1)
    expect(cli.rows.length).toBe(1)
  })

  it('RF02-01 GET /api/clientes responde 200 solo con rol administrador', async () => {
    var ok = await request(APP).get('/api/clientes').set('Authorization', 'Bearer ' + tokenAdmin)
    expect(ok.status).toBe(200)
    expect(Array.isArray(ok.body.clientes)).toBe(true)

    var sinToken = await request(APP).get('/api/clientes')
    expect(sinToken.status).toBe(401)

    var cliente = await request(APP).get('/api/clientes').set('Authorization', 'Bearer ' + tokenCliente)
    expect(cliente.status).toBe(403)
  })

  it('RF02-02 un cliente consulta su propio perfil y no el de otro', async () => {
    var propio = await request(APP)
      .get('/api/clientes/' + ids.clienteUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(propio.status).toBe(200)
    expect(propio.body.cliente.id).toBe(ids.clienteUsuarioId)

    var ajeno = await request(APP)
      .get('/api/clientes/' + ids.abogadoUsuarioId)
      .set('Authorization', 'Bearer ' + tokenCliente)
    expect(ajeno.status).toBe(403)
  })

  it('RF02-03 desactivacion logica es reversible (activo=false y activo=true)', async () => {
    var off = await request(APP)
      .put('/api/clientes/' + ids.clienteUsuarioId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ activo: false })
    expect(off.status).toBe(200)
    expect(off.body.cliente.activo).toBe(false)

    var fila = await queryTest('SELECT activo FROM Usuario WHERE id = $1', [ids.clienteUsuarioId])
    expect(fila.rows[0].activo).toBe(false)

    var on = await request(APP)
      .put('/api/clientes/' + ids.clienteUsuarioId + '/estado')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ activo: true })
    expect(on.status).toBe(200)
    expect(on.body.cliente.activo).toBe(true)
  })
})