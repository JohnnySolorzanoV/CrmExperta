const DEFAULT_API_BASE_URL = '/api';
const MENSAJE_SESION_EXPIRADA = 'Tu sesion expiro o es invalida. Inicia sesion nuevamente.';
let onUnauthorized = null;

function normalizarBaseUrl(baseUrl) {
  const valor = (baseUrl || '').trim();
  if (!valor) return DEFAULT_API_BASE_URL;
  return valor.replace(/\/+$/, '') || DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = normalizarBaseUrl(import.meta.env.VITE_API_BASE_URL);

export function buildApiUrl(path = '') {
  const ruta = String(path || '').trim();
  if (!ruta) return API_BASE_URL;
  const rutaNormalizada = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${API_BASE_URL}${rutaNormalizada}`;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = typeof handler === 'function' ? handler : null;
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(buildApiUrl(path), options);
  if (response.status === 401 && onUnauthorized) {
    onUnauthorized(MENSAJE_SESION_EXPIRADA);
  }
  return response;
}
