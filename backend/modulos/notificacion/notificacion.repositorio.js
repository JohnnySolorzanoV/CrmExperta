import { ejecutarConsulta as query } from '../../config/database.js'

// Repositorio del estado operativo de notificaciones. Complementa la auditoría:
// `auditoria_logs` guarda el rastro; `Notificacion` guarda el estado pendiente /
// enviada / fallida y el apartado de reintentos de cada correo.

var COLS = `id, id_cita as "idCita", tipo, destinatario, asunto, titulo, lineas,
            estado, intentos, intentos_max as "intentosMax", ultimo_error as "ultimoError",
            ultimo_intento_en as "ultimoIntentoEn", creada_en as "creadaEn",
            actualizada_en as "actualizadaEn"`

export async function crear({ idCita, tipo, destinatario, asunto, titulo, lineas }) {
  var r = await query(
    `INSERT INTO Notificacion (id_cita, tipo, destinatario, asunto, titulo, lineas, estado)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'pendiente')
     RETURNING ${COLS}`,
    [idCita, tipo, destinatario, asunto, titulo, JSON.stringify(lineas || [])]
  )
  return r.rows[0]
}

export async function marcarEnviada(id) {
  await query(
    `UPDATE Notificacion
     SET estado = 'enviada', ultimo_intento_en = NOW(), actualizada_en = NOW()
     WHERE id = $1`,
    [id]
  )
}

export async function marcarFallida(id, ultimoError) {
  await query(
    `UPDATE Notificacion
     SET estado = 'fallida',
         intentos = intentos + 1,
         ultimo_error = LEFT($2::text, 500),
         ultimo_intento_en = NOW(),
         actualizada_en = NOW()
     WHERE id = $1`,
    [id, ultimoError || 'envio no disponible']
  )
}

// Recupera notificaciones pendientes (nunca intentadas por una caida del proceso)
// o fallidas que aun conservan reintentos disponibles.
export async function listarReprocesables({ limite = 20 } = {}) {
  var r = await query(
    `SELECT ${COLS} FROM Notificacion
     WHERE estado = 'pendiente' OR (estado = 'fallida' AND intentos < intentos_max)
     ORDER BY creada_en ASC
     LIMIT $1`,
    [limite]
  )
  return r.rows
}