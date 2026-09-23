// Configuración centralizada de la API.
// La URL nunca se hardcodea en los componentes: siempre se lee de la
// variable de entorno de Vite VITE_API_URL (ver .env.example).
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Llama a GET /api/health/ en el backend Django y devuelve el JSON
 * de respuesta si el backend está funcionando correctamente.
 * Lanza un error si la petición falla o el backend responde con error.
 */
export async function checkBackendHealth() {
  const response = await fetch(`${API_URL}/health/`);

  if (!response.ok) {
    throw new Error(`El backend respondió con estado ${response.status}`);
  }

  return response.json();
}
