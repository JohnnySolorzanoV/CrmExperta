import { describe, expect, it } from 'vitest'
import { Usuario } from '../../entidades/usuario.js'
import { Cita } from '../../entidades/cita.js'
import { Caso } from '../../entidades/caso.js'
import { Abogado } from '../../entidades/abogado.js'

describe('entidades', () => {
  it('UNIT-ENTIDADES-01 Usuario asigna correctamente los campos base del modelo', () => {
    var u = new Usuario({
      id: 1,
      identificacion: '0101',
      nombre: 'User Test',
      correo: 'user@test.com',
      contrasena: 'hash',
      fechaRegistro: '2026-07-05',
    })

    expect(u.id).toBe(1)
    expect(u.identificacion).toBe('0101')
    expect(u.nombre).toBe('User Test')
    expect(u.correo).toBe('user@test.com')
  })

  it('UNIT-ENTIDADES-02 Cita aplica los valores por defecto definidos para campos opcionales', () => {
    var c = new Cita({
      id: 2,
      idCliente: 10,
      idAbogado: 20,
      fechaHoraCopia: '2026-07-05T10:00:00.000Z',
      idCalendario: 3,
    })

    expect(c.estadoCita).toBe('pendiente')
    expect(c.abogadoNombre).toBe('')
    expect(c.clienteNombre).toBe('')
    expect(c.motivo).toBe('')
    expect(c.googleEventId).toBeNull()
    expect(c.motivoCancelacion).toBeNull()
    expect(c.canceladoPor).toBeNull()
  })

  it('UNIT-ENTIDADES-03 Caso asigna campos requeridos y mantiene valores por defecto en nombres opcionales', () => {
    var caso = new Caso({
      id: 1,
      estadoCaso: 'abierto',
      fechaApertura: '2026-07-05',
      tipoCaso: 'civil',
      nombreCaso: 'Cobro',
      idCliente: 7,
      idAbogado: 8,
    })
    expect(caso.nombreCaso).toBe('Cobro')
    expect(caso.clienteNombre).toBe('')
    expect(caso.abogadoNombre).toBe('')
  })

  it('UNIT-ENTIDADES-04 Abogado hereda de Usuario y expone sus atributos especificos', () => {
    var a = new Abogado({
      id: 9,
      identificacion: '0102',
      nombre: 'A Test',
      correo: 'a@test.com',
      especialidad: 'Civil',
      numLicencia: 'MAT-001',
    })
    expect(a.nombre).toBe('A Test')
    expect(a.especialidad).toBe('Civil')
    expect(a.numLicencia).toBe('MAT-001')
  })

})
