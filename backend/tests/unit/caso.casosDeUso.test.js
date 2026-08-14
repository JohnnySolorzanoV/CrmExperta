import { beforeEach, describe, expect, it, vi } from 'vitest'

var mockRepo = {
  crear: vi.fn(),
  actualizarEstado: vi.fn(),
  actualizarNotasConclusiones: vi.fn(),
}

var mockCitaRepo = {
  buscarPorId: vi.fn(),
  actualizarEstado: vi.fn(),
}

var mockDb = {
  ejecutarConsulta: vi.fn(),
}

vi.mock('../../modulos/casos/caso.repositorio.js', () => mockRepo)
vi.mock('../../modulos/citas/cita.repositorio.js', () => mockCitaRepo)
vi.mock('../../config/database.js', () => mockDb)

describe('caso.casosDeUso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('UNIT-CASOS-01 actualizarEstadoCaso rechaza valores de estado fuera del catalogo permitido', async () => {
    var { actualizarEstadoCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    await expect(actualizarEstadoCaso(11, 'inventado')).rejects.toMatchObject({
      message: 'Estado invalido',
      status: 400,
    })
  })

  it('UNIT-CASOS-02 crearCaso rechaza solicitudes sin los datos minimos requeridos', async () => {
    var { crearCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    await expect(crearCaso({ tipoCaso: 'civil' })).rejects.toMatchObject({
      message: 'Faltan datos del caso',
      status: 400,
    })
  })

  it('UNIT-CASOS-03 crearCaso retorna error cuando el cliente no existe en base de datos', async () => {
    mockDb.ejecutarConsulta
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    var { crearCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    await expect(
      crearCaso({
        tipoCaso: 'civil',
        nombreCaso: 'Cobro',
        idCliente: 12,
        idAbogado: 20,
      })
    ).rejects.toMatchObject({
      message: 'Cliente no encontrado',
      status: 404,
    })
  })

  it('UNIT-CASOS-04 actualizarNotasConclusionesCaso normaliza textos y delega la persistencia con valores saneados', async () => {
    mockRepo.actualizarNotasConclusiones.mockResolvedValue({ id: 11, notas: 'Nota final', conclusiones: 'Conclusion final' })
    var { actualizarNotasConclusionesCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    var r = await actualizarNotasConclusionesCaso(11, { notas: '  Nota final  ', conclusiones: '  Conclusion final  ' })

    expect(mockRepo.actualizarNotasConclusiones).toHaveBeenCalledWith(11, 'Nota final', 'Conclusion final', null)
    expect(r.notas).toBe('Nota final')
    expect(r.conclusiones).toBe('Conclusion final')
  })

  it('UNIT-CASOS-05 actualizarNotasConclusionesCaso rechaza payload cuando notas o conclusiones no son texto', async () => {
    var { actualizarNotasConclusionesCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    await expect(actualizarNotasConclusionesCaso(11, { notas: 10, conclusiones: 'ok' })).rejects.toMatchObject({
      message: 'Notas y conclusiones deben ser texto',
      status: 400,
    })
  })

  it('UNIT-CASOS-06 actualizarNotasConclusionesCaso retorna 404 cuando el caso no existe', async () => {
    mockRepo.actualizarNotasConclusiones.mockResolvedValue(null)
    var { actualizarNotasConclusionesCaso } = await import('../../modulos/casos/caso.casosDeUso.js')

    await expect(actualizarNotasConclusionesCaso(999, { notas: 'N', conclusiones: 'C' })).rejects.toMatchObject({
      message: 'Caso no encontrado',
      status: 404,
    })
  })

  it('UNIT-CASOS-07 crearCaso con idCita valida la cita confirmada y la marca completada', async () => {
    mockDb.ejecutarConsulta
      .mockResolvedValueOnce({ rows: [{ id: 12 }] })
      .mockResolvedValueOnce({ rows: [{ id: 20 }] })
    mockCitaRepo.buscarPorId.mockResolvedValue({
      id: 7,
      idCliente: 12,
      idAbogado: 20,
      estadoCita: 'confirmada',
    })
    mockRepo.crear.mockResolvedValue({ id: 3, nombreCaso: 'Cobro' })
    mockCitaRepo.actualizarEstado.mockResolvedValue({ id: 7, estadoCita: 'completada' })

    var { crearCaso } = await import('../../modulos/casos/caso.casosDeUso.js')
    var r = await crearCaso({
      tipoCaso: 'civil',
      nombreCaso: 'Cobro',
      idCliente: 12,
      idAbogado: 20,
      idCita: 7,
    })

    expect(r.id).toBe(3)
    expect(mockCitaRepo.buscarPorId).toHaveBeenCalledWith(7)
    expect(mockCitaRepo.actualizarEstado).toHaveBeenCalledWith(7, 'completada', null)
  })

  it('UNIT-CASOS-08 crearCaso rechaza abrir un caso desde una cita que no esta confirmada', async () => {
    mockDb.ejecutarConsulta
      .mockResolvedValueOnce({ rows: [{ id: 12 }] })
      .mockResolvedValueOnce({ rows: [{ id: 20 }] })
    mockCitaRepo.buscarPorId.mockResolvedValue({
      id: 7,
      idCliente: 12,
      idAbogado: 20,
      estadoCita: 'pendiente',
    })

    var { crearCaso } = await import('../../modulos/casos/caso.casosDeUso.js')
    await expect(
      crearCaso({
        tipoCaso: 'civil',
        nombreCaso: 'Cobro',
        idCliente: 12,
        idAbogado: 20,
        idCita: 7,
      })
    ).rejects.toMatchObject({
      message: 'Solo se puede abrir un caso desde una cita confirmada',
      status: 409,
    })
    expect(mockRepo.crear).not.toHaveBeenCalled()
  })
})
