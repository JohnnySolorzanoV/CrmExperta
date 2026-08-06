// Fuente única del horario institucional de CRM Experta.
//
// Política de zona horaria:
//   - Todos los datos de negocio se almacenan y comparan en UTC (sin conversión).
//   - El horario de atención se define abajo en UTC aplicando el offset fijo de
//     Ecuador continental (America/Guayaquil = UTC-5, sin horario de verano).
//   - La presentación al usuario (frontend y correos) formatea a America/Guayaquil.
//
// Horas de inicio de slots de 1 hora en Guayaquil: 10:00-12:00 y 15:00-17:00.
// En UTC (Guayaquil + 5):
//   10:00 -> 15:00Z, 11:00 -> 16:00Z, 15:00 -> 20:00Z, 16:00 -> 21:00Z

export var ZONA_INSTITUCIONAL = 'America/Guayaquil'

export var OFFSET_GUAYAQUIL_UTC_HORAS = 5

// Horas de inicio de slots de atencion, expresadas en UTC.
export var HORAS_ATENCION_UTC = [15, 16, 20, 21]

// Ventana de validacion derivada de HORAS_ATENCION_UTC (min .. max+1).
// Equivale a [10:00, 17:00) en Guayaquil.
export var HORA_INICIO_UTC = 15
export var HORA_FIN_UTC = 22