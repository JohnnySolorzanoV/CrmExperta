import { beforeEach, describe, expect, it, vi } from 'vitest'

var repo = {
  obtenerPorCaso: vi.fn(),
  buscarPorId: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
}

vi.mock('../../modulos/documentos/documento.repositorio.js', () => repo)

describe('documento.casosDeUso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('UNIT-DOCUMENTOS-01 subirDocumento rechaza extensiones fuera de la lista permitida', async () => {
    var { subirDocumento } = await import('../../modulos/documentos/documento.casosDeUso.js')
    await expect(
      subirDocumento({
        idCaso: 1,
        nombreDocumento: 'contrato.exe',
        extension: 'exe',
      })
    ).rejects.toMatchObject({ status: 400 })
  })

  it('UNIT-DOCUMENTOS-02 subirDocumento normaliza la extension y delega la creacion del registro', async () => {
    repo.crear.mockResolvedValue({ id: 10, extension: 'pdf' })
    var { subirDocumento } = await import('../../modulos/documentos/documento.casosDeUso.js')
    var r = await subirDocumento({
      idCaso: 1,
      nombreDocumento: 'contrato.pdf',
      extension: '.PDF',
      tamaño: 200,
    })
    expect(r.id).toBe(10)
    expect(repo.crear).toHaveBeenCalledOnce()
  })
})
