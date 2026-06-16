import { Router } from 'express'
import { verificarToken } from '../../config/autenticacion.js'
import { consultar, obtenerHistorial } from './chatbot.casosDeUso.js'
import { agendarCita } from '../citas/cita.casosDeUso.js'
import { ejecutarConsulta } from '../../config/database.js'

var router = Router()

router.post('/consultar', verificarToken, async (req, res, next) => {
  try {
    var { idUsuario, mensaje } = req.body
    var R = await consultar({ idUsuario, mensaje })
    res.json(R)
  } catch (error) { next(error) }
})

router.post('/agendar', verificarToken, async (req, res, next) => {
  try {
    // recibe el resumen generado por la AI y agenda la cita
    var { idCliente, idAbogado, resumen, tipoConsulta, motivo } = req.body
    if (!idCliente || !resumen) {
      throw Object.assign(new Error('Faltan datos para agendar desde chat'), { status: 400 })
    }

    // si no se especifico abogado, buscar uno por especialidad
    var idAbogadoFinal = idAbogado
    if (!idAbogadoFinal && tipoConsulta) {
      var abogados = await ejecutarConsulta(
        `SELECT u.id FROM Usuario u
         JOIN Abogado a ON a.id_usuario = u.id
         WHERE LOWER(a.especialidad) LIKE LOWER($1) LIMIT 1`,
        ['%' + tipoConsulta + '%']
      )
      if (abogados.rows.length > 0) {
        idAbogadoFinal = abogados.rows[0].id
      }
    }

    if (!idAbogadoFinal) {
      // si no hay abogado de esa especialidad, tomar el primero
      var primerAbogado = await ejecutarConsulta(
        'SELECT u.id FROM Usuario u JOIN Abogado a ON a.id_usuario = u.id LIMIT 1'
      )
      if (primerAbogado.rows.length > 0) {
        idAbogadoFinal = primerAbogado.rows[0].id
      } else {
        throw Object.assign(new Error('No hay abogados disponibles'), { status: 400 })
      }
    }

    // crear la cita
    var citaCreada = await agendarCita({
      idCliente,
      idAbogado: idAbogadoFinal,
      fechaHoraCopia: new Date(Date.now() + 86400000).toISOString(), // mañana
      motivo: motivo || resumen.substring(0, 200),
      resumenChatbot: resumen
    })

    res.status(201).json({
      mensaje: 'Cita agendada desde chat',
      cita: citaCreada,
      resumen
    })
  } catch (error) { next(error) }
})

router.get('/historial/:idUsuario', verificarToken, async (req, res, next) => {
  try {
    var HIST = await obtenerHistorial(Number(req.params.idUsuario))
    res.json({ historial: HIST })
  } catch (error) { next(error) }
})

export default router
