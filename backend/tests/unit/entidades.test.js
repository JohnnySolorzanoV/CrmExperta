import { describe, expect, it } from 'vitest'
import { Usuario } from '../../entidades/usuario.js'
import { Cita } from '../../entidades/cita.js'
import { Caso } from '../../entidades/caso.js'
import { Abogado } from '../../entidades/abogado.js'

describe('entidades', () => {
  it('Usuario asigna campos base', () => {
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

  it('Cita aplica defaults esperados', () => {
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

  it('Caso asigna campos y nombres opcionales', () => {
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

  it('Abogado hereda Usuario y agrega datos propios', () => {
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
