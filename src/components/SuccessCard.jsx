import { useEffect, useRef } from 'react';
import { useFocusTrap } from '../helpers/UseFocusTrap';
import { FONT_HEADLINE, BOTON_PRINCIPAL } from './ui';

// Modal de feedback reutilizado en toda la app: variant="exito" (verde,
// check_circle, botón "Aceptar" por defecto) o variant="error" (rojo,
// ícono "error", botón "Reintentar" por defecto). Mismo fondo difuminado
// y foco atrapado en ambos casos — solo cambia el color/ícono y qué hace
// el botón, que decide quien llama al componente vía onCerrar.
export default function SuccessModal({
  open, variant = 'exito', titulo, mensaje, accionLabel, onCerrar,
}) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const esError = variant === 'error';

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCerrar]);

  useFocusTrap(open, dialogRef);

  if (!open) return null;

  const etiquetaBoton = accionLabel ?? (esError ? 'Reintentar' : 'Aceptar');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#181b27]/40 backdrop-blur-sm px-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-heading"
        aria-describedby="feedback-modal-mensaje"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl flex flex-col items-center gap-4 text-center"
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${esError ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#eaf7ee] text-[#1e5a34]'}`}>
          <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
            {esError ? 'error' : 'check_circle'}
          </span>
        </div>

        <div>
          <h2
            id="feedback-modal-heading"
            ref={headingRef}
            tabIndex={-1}
            className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27] focus:outline-none`}
          >
            {titulo}
          </h2>
          <p id="feedback-modal-mensaje" className="text-sm text-[#49454f] mt-1">
            {mensaje}
          </p>
        </div>

        <button
          type="button"
          className={`${BOTON_PRINCIPAL} w-full justify-center`}
          onClick={onCerrar}
          aria-live="polite"
        >
          {etiquetaBoton}
        </button>
      </div>
    </div>
  );
}