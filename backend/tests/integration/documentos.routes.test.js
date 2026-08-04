import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

describe('Integracion /api/documentos', () => {
  var ids
  var tokenAbogado
  var casoId

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
    var caso = await queryTest(
      `INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['abierto', 'civil', 'Caso Docs API', ids.clientePkId, ids.abogadoPkId]
    )
    casoId = caso.rows[0].id
  })

  it('INT-DOCUMENTOS-01 POST /api/documentos sube un archivo multipart y crea el documento asociado al caso', async () => {
    var bufferArchivo = Buffer.from('%PDF-1.4 demo de demanda')
    var r = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', String(casoId))
      .field('descripcion', 'Demanda inicial')
      .attach('archivo', bufferArchivo, 'demanda.pdf')

    expect(r.status).toBe(201)
    expect(r.body.documento?.idCaso).toBe(casoId)
    expect(r.body.documento?.extension).toBe('pdf')
  })

  it('INT-DOCUMENTOS-02 GET /:id/descargar entrega el contenido del archivo', async () => {
    var bufferArchivo = Buffer.from('%PDF-1.4 contenido descargable')
    var up = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', String(casoId))
      .attach('archivo', bufferArchivo, 'demanda.pdf')

    expect(up.status).toBe(201)
    var docId = up.body.documento.id

    var r = await request(APP)
      .get('/api/documentos/' + docId + '/descargar')
      .set('Authorization', 'Bearer ' + tokenAbogado)

    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toContain('pdf')
  })

  it('RF09-01 DELETE /:id elimina el registro y el archivo fisico del servidor', async () => {
    var bufferArchivo = Buffer.from('%PDF-1.4 para borrar')
    var up = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', String(casoId))
      .attach('archivo', bufferArchivo, 'borrar.pdf')
    expect(up.status).toBe(201)
    var docId = up.body.documento.id

    var fila = await queryTest('SELECT ruta_archivo FROM Documento WHERE id = $1', [docId])
    expect(fila.rows[0].ruta_archivo).toMatch(/^\/uploads\//)

    var r = await request(APP)
      .delete('/api/documentos/' + docId)
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(r.status).toBe(200)
    expect(r.body.archivoEliminado).toBe(true)

    var filaTras = await queryTest('SELECT id FROM Documento WHERE id = $1', [docId])
    expect(filaTras.rows.length).toBe(0)
  })

  it('RF09-04 GET /:id/descargar responde 404 si el archivo fisico no existe', async () => {
    var doc = await queryTest(
      "INSERT INTO Documento (id_caso, nombre_documento, extension, ruta_archivo, tamaño) VALUES ($1, 'inexistente.pdf', 'pdf', '/uploads/no_existe.pdf', 10) RETURNING id",
      [casoId]
    )
    var r = await request(APP)
      .get('/api/documentos/' + doc.rows[0].id + '/descargar')
      .set('Authorization', 'Bearer ' + tokenAbogado)
    expect(r.status).toBe(404)
    expect(r.body.error).toContain('no encontrado')
  })
})
