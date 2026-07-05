const DEFAULT_API_BASE_URL = '/api';

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
