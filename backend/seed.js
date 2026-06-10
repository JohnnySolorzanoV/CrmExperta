import pg from 'pg'
import bcrypt from 'bcrypt'

var DB_URL = process.env.DATABASE_URL || 'postgres://postgres:admin1234@localhost:5432/crm_experta'

var CORREO_ADMIN = 'admin@crm.com'
var PASS_ADMIN = 'admin123'

async function seed() {
  var POOL = new pg.Pool({ connectionString: DB_URL })

  var ya_existe = await POOL.query(
    `SELECT u.id FROM Usuario u
     JOIN Administrador a ON u.id = a.id_usuario
     WHERE u.correo = $1`,
    [CORREO_ADMIN]
  )

  if (ya_existe.rows.length > 0) {
    console.log('Admin ya existe id:', ya_existe.rows[0].id)
    console.log('mail:', CORREO_ADMIN, '/ pass:', PASS_ADMIN)
    await POOL.end()
    return
  }

  var hash_pass = await bcrypt.hash(PASS_ADMIN, 10)

  var RES = await POOL.query(
    `INSERT INTO Usuario (identificacion, nombre, correo, contrasena)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['ADMIN-001', 'Administrador del Sistema', CORREO_ADMIN, hash_pass]
  )

  await POOL.query(`INSERT INTO Administrador (id_usuario) VALUES ($1)`, [RES.rows[0].id])

  console.log('Admin creado:')
  console.log('mail:', CORREO_ADMIN)
  console.log('pass:', PASS_ADMIN)

  await POOL.end()
}

seed().catch(function (err) {
  console.error('error seed:', err.message)
  process.exit(1)
})
