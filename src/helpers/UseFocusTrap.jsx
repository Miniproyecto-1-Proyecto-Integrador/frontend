import { useEffect } from 'react';

// Trampa de foco real para un contenedor con role="dialog"/"alertdialog"
// aria-modal="true": mientras `active` es true, Tab y Shift+Tab quedan
// atrapados entre el primer y el último elemento enfocable de `containerRef`.
// Sin esto, aria-modal="true" es una promesa que el DOM no cumple: la
// tecnología asistiva anuncia "todo detrás está inerte" pero el foco sigue
// pudiendo escapar hacia la página de atrás.

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active, containerRef) {
  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    function onKeyDown(e) {
      if (e.key !== 'Tab') return;

      const focusables = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activo = document.activeElement;

      if (e.shiftKey) {
        if (activo === first || !container.contains(activo)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activo === last || !container.contains(activo)) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [active, containerRef]);
}