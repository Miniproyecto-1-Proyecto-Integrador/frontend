// Funciones de API para eventos y subtareas / gestiones
// logísticas.
import { API_URL } from './api';
import { authFetch } from './auth';
/**
 * Función interna: hace la petición HTTP, revisa si el backend
 * respondió con error y, si todo salió bien, devuelve el JSON ya
 * convertido a objeto de JavaScript.
**/
async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  const response = await authFetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // DELETE exitoso responde 204 y no trae body para parsear.
  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    // Si el backend manda { "detail": "..." } (típico en 404 y 401), usamos ese mensaje.
    // Si manda { "campo": ["mensaje"] } (típico en 400), lo guardamos en
    // error.fieldErrors para poder mostrarlo junto al campo del formulario.
    const error = new Error(
      (data && data.detail) || 'No pudimos completar la operación. Intenta de nuevo.'
    );
    error.status = response.status;
    error.fieldErrors = data && !data.detail ? data : {};
    error.data = data;
    error.conflicto = data?.conflicto ?? null;
    throw error;
  }

  return data;
}

// ----------------------- Eventos -----------------------

/** GET /events/ — trae todos los eventos */
export function listEvents() {
  return request('/events/');
}

/** GET /events/:id/ — trae el detalle de un evento */
export function getEvent(id) {
  return request(`/events/${id}/`);
}

/**
 * POST /events/ — crea un evento nuevo.
 * payload: { nombre, tipo, fecha_hora, cliente_contacto, lugar }
 */
export function createEvent(payload) {
  return request('/events/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PATCH /events/:id/ — edita un evento (solo los campos que mandes) */
export function updateEvent(id, payload) {
  return request(`/events/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** DELETE /events/:id/ — elimina un evento */
export function deleteEvent(id) {
  return request(`/events/${id}/`, { method: 'DELETE' });
}

// -------------------- Subtareas (gestiones logísticas) --------------------

/** GET /events/:eventId/subtasks/ — trae las gestiones logísticas de un evento */
export function listSubtasks(eventId) {
  return request(`/events/${eventId}/subtasks/`);
}

/**
 * POST /events/:eventId/subtasks/ — crea una gestión logística para ese evento.
 * payload: { titulo, fecha_objetivo, horas_estimadas }
 * No incluir "evento" en el payload: el backend lo asigna solo, según la URL.
 */
export function createSubtask(eventId, payload) {
  return request(`/events/${eventId}/subtasks/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


/**
 * GET /events/:eventId/subtasks/proxima-fecha/
 * Busca una fecha donde quepan las horas completas de la gestión.
 */
  export function getProximaFechaDisponible(
    eventId,
    fecha,
    horas,
    excluirId = null
  ) {
    const params = new URLSearchParams({
      fecha,
      horas: String(horas),
    });

    if (excluirId !== null) {
      params.set('excluir_id', String(excluirId));
    }

    return request(
      `/events/${eventId}/subtasks/proxima-fecha/?${params.toString()}`
    );
  }


/** PATCH /events/:eventId/subtasks/:id/ — edita una gestión logística */
export function updateSubtask(eventId, id, payload) {
  return request(`/events/${eventId}/subtasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** DELETE /events/:eventId/subtasks/:id/ — elimina una gestión logística */
export function deleteSubtask(eventId, id) {
  return request(`/events/${eventId}/subtasks/${id}/`, { method: 'DELETE' });
}

// ----------------------- Vista "Hoy" -----------------------

/**
 * GET /hoy/ — gestiones del organizador agrupadas en vencidas / hoy / próximas.
 * filtros: { estado: 'pendiente' | 'hecha' | 'todas', evento: <id> }
 * Solo se mandan los que vengan con valor; si se omiten, el backend aplica
 * su default (estado=pendiente, todos los eventos).
 */
export function getHoy({ estado, evento } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (evento) params.set('evento', evento);
  const query = params.toString();
  return request(`/hoy/${query ? `?${query}` : ''}`);
}

// -------------------- Límite diario --------------------

/** GET /limite-diario/ — obtiene el límite diario del organizador */
export function getLimiteDiario() {
  return request('/limite-diario/');
}

/** PUT /limite-diario/ — actualiza el límite diario del organizador */
export function updateLimiteDiario(horas) {
  return request('/limite-diario/', {
    method: 'PUT',
    body: JSON.stringify({ horas }),
  });
}