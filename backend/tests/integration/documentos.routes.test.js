import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir, rm } from 'node:fs/promises'
import { APP } from '../../server.js'
import { crearTokenTest } from '../helpers/authTestUtils.js'
import { verificarBasePruebasDisponible, queryTest, resetearBasePruebas, sembrarUsuariosBase } from '../helpers/dbTestUtils.js'

var __dirname = dirname(fileURLToPath(import.meta.url))
var UPLOAD_DIR = resolve(__dirname, '../../uploads')

async function cantidadArchivosAlmacenados() {
  try {
    return (await readdir(UPLOAD_DIR)).length
  } catch {
    return 0
  }
}

async function limpiarAlmacenamiento() {
  var archivos = await readdir(UPLOAD_DIR).catch(() => [])
  for (var f of archivos) {
    await rm(resolve(UPLOAD_DIR, f), { force: true })
  }
}

describe('Integracion /api/documentos', () => {
  var ids
  var tokenAbogado
  var casoId

  beforeAll(async () => {
    await verificarBasePruebasDisponible()
  })

  beforeEach(async () => {
    await resetearBasePruebas()
    await limpiarAlmacenamiento()
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

  // ---- RFC12: archivos invalidos u huerfanos -------------------------------

  it('RFC12-01 rechaza una extension prohibida sin dejar archivo en disco', async () => {
    var antes = await cantidadArchivosAlmacenados()
    var r = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', String(casoId))
      .attach('archivo', Buffer.from('MZ......'), 'malware.exe')
    expect(r.status).toBe(400)
    expect(r.body.error).toContain('Extension no permitida')
    expect(await cantidadArchivosAlmacenados()).toBe(antes)
  })

  it('RFC12-02 rechaza un MIME falso (pdf con Content-Type image/jpeg) sin archivo en disco', async () => {
    var antes = await cantidadArchivosAlmacenados()
    var r = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', String(casoId))
      .attach('archivo', Buffer.from('%PDF-1.4 falso'), {
        filename: 'demanda.pdf',
        contentType: 'image/jpeg',
      })
    expect(r.status).toBe(400)
    expect(r.body.error).toContain('MIME')
    expect(await cantidadArchivosAlmacenados()).toBe(antes)
  })

  it('RFC12-03 rechaza subir a un caso ajeno y no deja archivo huerfano', async () => {
    // Un segundo abogado con su propio caso.
    var usuario2 = await queryTest(
      "INSERT INTO Usuario (identificacion, nombre, correo, contrasena) VALUES ('0202000002', 'Abogado2', 'abogado2@test.com', 'hash') RETURNING id"
    )
    var abogado2 = await queryTest(
      "INSERT INTO Abogado (id_usuario, num_licencia, especialidad) VALUES ($1, 'MAT-TEST-002', 'Penal') RETURNING id",
      [usuario2.rows[0].id]
    )
    var casoAjeno = await queryTest(
      'INSERT INTO Caso (estado_caso, tipo_caso, nombre_caso, id_cliente, id_abogado) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      ['abierto', 'penal', 'Caso Ajeno', ids.clientePkId, abogado2.rows[0].id]
    )

    var antes = await cantidadArchivosAlmacenados()
    var r = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', String(casoAjeno.rows[0].id))
      .attach('archivo', Buffer.from('%PDF-1.4 ajeno'), 'ajeno.pdf')
    expect(r.status).toBe(403)
    expect(r.body.error).toContain('No estas asignado')
    expect(await cantidadArchivosAlmacenados()).toBe(antes)

    var fila = await queryTest('SELECT id FROM Documento WHERE id_caso = $1', [casoAjeno.rows[0].id])
    expect(fila.rows.length).toBe(0)
  })

  it('RFC12-04 un fallo de base posterior a la recepcion del archivo elimina el archivo temporal', async () => {
    var antes = await cantidadArchivosAlmacenados()
    var r = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', '999999') // caso inexistente -> fallo en validacion/insert
      .attach('archivo', Buffer.from('%PDF-1.4 fallo'), 'fallo.pdf')
    expect(r.status).toBe(403)
    expect(await cantidadArchivosAlmacenados()).toBe(antes)
  })

  it('RFC12-05 una subida valida deja la base y el almacenamiento sincronizados', async () => {
    var antes = await cantidadArchivosAlmacenados()
    var r = await request(APP)
      .post('/api/documentos')
      .set('Authorization', 'Bearer ' + tokenAbogado)
      .field('idCaso', String(casoId))
      .attach('archivo', Buffer.from('%PDF-1.4 sincrono'), 'sincrono.pdf')
    expect(r.status).toBe(201)

    var docId = r.body.documento.id
    var fila = await queryTest('SELECT ruta_archivo FROM Documento WHERE id = $1', [docId])
    var nombre = fila.rows[0].ruta_archivo.replace('/uploads/', '')
    var archivos = await readdir(UPLOAD_DIR)
    expect(archivos.includes(nombre)).toBe(true)
    expect(await cantidadArchivosAlmacenados()).toBe(antes + 1)
  })
})
