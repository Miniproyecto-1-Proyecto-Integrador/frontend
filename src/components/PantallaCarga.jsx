import { useEffect, useState } from 'react';
import { CARD_HEADER_ICON, FONT_HEADLINE, Icon } from './ui';

// Segundos antes de avisar que el servidor está tardando (p. ej. Render
// despertando un servicio inactivo).
const SEGUNDOS_LENTO = 5;

// Pantalla completa que se muestra mientras se verifica la sesión con el
// backend (GET /auth/me/). Reutiliza la marca y la paleta del layout.
// role="status" + aria-busy avisan a lectores de pantalla; el spinner respeta
// prefers-reduced-motion.
export default function PantallaCarga({ mensaje = 'Verificando sesión…' }) {
  const [lento, setLento] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setLento(true), SEGUNDOS_LENTO * 1000);
    return () => clearTimeout(id);
  }, []);

  return (
    <main
      role="status"
      aria-busy="true"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#faf8ff] px-6 text-center text-[#181b27]"
    >
      <div className="flex items-center gap-3">
        <div className={CARD_HEADER_ICON}>
          <Icon name="auto_schedule" className="text-[24px]" />
        </div>
        <span className={`${FONT_HEADLINE} text-2xl font-bold tracking-tight`}>Planify</span>
      </div>

      <div
        aria-hidden="true"
        className="h-10 w-10 animate-spin motion-reduce:animate-none rounded-full border-4 border-[#e5e7f8] border-t-[#63518b]"
      />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[#49454f]">{mensaje}</p>
        {lento && (
          <p className="text-sm text-[#625d66]">
            El servidor está despertando, un momento…
          </p>
        )}
      </div>
    </main>
  );
}
