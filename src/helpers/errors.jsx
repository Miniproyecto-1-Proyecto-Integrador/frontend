// Un "Failed to fetch" (o su TypeError equivalente) significa que la
// petición nunca llegó a completarse: sin conexión, backend caído, CORS,
// DNS, etc. En ese caso el navegador guarda ese texto crudo en err.message,
// y no queremos mostrárselo tal cual al usuario.
export function esFalloDeRed(err) {
  return err instanceof TypeError || /failed to fetch/i.test(err?.message || '');
}

export const MENSAJE_ERROR_RED = 'Algo salió mal. Revisa tu conexión e inténtalo de nuevo.';