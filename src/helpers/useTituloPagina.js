import { useEffect } from 'react';

// WCAG 2.4.2 (Página titulada): en una SPA el <title> no cambia solo al navegar,
// así que cada vista lo actualiza para que lectores de pantalla, pestañas del
// navegador e historial distingan en qué pantalla está la persona.
export function useTituloPagina(titulo) {
  useEffect(() => {
    if (titulo) document.title = `${titulo} · Planify`;
  }, [titulo]);
}
