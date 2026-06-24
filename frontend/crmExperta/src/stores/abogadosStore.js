import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAbogadosStore = defineStore('abogados', () => {
  const abogados = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const mensaje = ref('')

  function authHeaders(token) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  }

  async function mensajeErrorDesdeResponse(response, fallback) {
    try {
      const data = await response.json()
      if (data?.error) return data.error
      if (data?.mensaje) return data.mensaje
    } catch {
      // Ignorar parse error y usar fallback.
    }
    return fallback
  }

  async function fetchAbogados(token) {
    if (!token) {
      mensaje.value = 'Inicia sesión como administrador para cargar los abogados.'
      return false
    }

    loading.value = true
    mensaje.value = ''
    try {
      const response = await fetch('/api/abogados', { headers: authHeaders(token) })
      if (!response.ok) throw new Error(await mensajeErrorDesdeResponse(response, 'No se pudo cargar la lista de abogados'))
      const data = await response.json()
      abogados.value = data.abogados || []
      return true
    } catch (error) {
      mensaje.value = error.message
      return false
    } finally {
      loading.value = false
    }
  }

  async function crearAbogado(token, payload) {
    if (!token) {
      mensaje.value = 'Debes iniciar sesión como administrador para completar esta acción.'
      return false
    }

    saving.value = true
    mensaje.value = ''
    try {
      const response = await fetch('/api/abogados', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error(await mensajeErrorDesdeResponse(response, 'Error al crear el abogado'))
      mensaje.value = 'Abogado creado correctamente.'
      await fetchAbogados(token)
      return true
    } catch (error) {
      mensaje.value = error.message
      return false
    } finally {
      saving.value = false
    }
  }

  async function actualizarAbogado(token, abogadoId, payload) {
    if (!token) {
      mensaje.value = 'Debes iniciar sesión como administrador para completar esta acción.'
      return false
    }

    saving.value = true
    mensaje.value = ''
    try {
      const response = await fetch(`/api/abogados/${abogadoId}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error(await mensajeErrorDesdeResponse(response, 'Error al actualizar el abogado'))
      mensaje.value = 'Abogado actualizado correctamente.'
      await fetchAbogados(token)
      return true
    } catch (error) {
      mensaje.value = error.message
      return false
    } finally {
      saving.value = false
    }
  }

  async function eliminarAbogado(token, abogadoId) {
    if (!token) {
      mensaje.value = 'Debes iniciar sesión para eliminar un abogado.'
      return false
    }

    saving.value = true
    mensaje.value = ''
    try {
      const response = await fetch(`/api/abogados/${abogadoId}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      })
      if (!response.ok) throw new Error(await mensajeErrorDesdeResponse(response, 'Error al eliminar el abogado'))
      mensaje.value = 'Abogado eliminado correctamente.'
      await fetchAbogados(token)
      return true
    } catch (error) {
      mensaje.value = error.message
      return false
    } finally {
      saving.value = false
    }
  }

  function limpiarMensaje() {
    mensaje.value = ''
  }

  function setMensaje(nuevoMensaje) {
    mensaje.value = nuevoMensaje
  }

  return {
    abogados,
    loading,
    saving,
    mensaje,
    fetchAbogados,
    crearAbogado,
    actualizarAbogado,
    eliminarAbogado,
    limpiarMensaje,
    setMensaje
  }
})
