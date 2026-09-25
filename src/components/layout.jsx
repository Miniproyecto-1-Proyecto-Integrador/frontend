import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CARD_HEADER_ICON, FONT_HEADLINE } from './ui';
import { useFocusTrap } from '../helpers/UseFocusTrap';

// "Hoy" y "Progreso y Métricas" todavía no existen como pantallas —
// se muestran deshabilitadas para no simular navegación a algo que no
// está construido (US-04/US-10, sprints futuros).
// "Mis Eventos" sí está activa: apunta a /evento, un listado plano
// (GET /api/events/) que no implementa nada de US-04 — solo permite
// navegar a los eventos que ya existen.
const NAV_ITEMS = [
  { to: '/crear', label: 'Crear Evento', icon: 'add_circle' },
  { to: '/evento', label: 'Mis Eventos', icon: 'event_available' },
  { label: 'Hoy', icon: 'today', disabled: true },
  { label: 'Progreso y Métricas', icon: 'query_stats', disabled: true },
];

export default function Layout() {
  // El sidebar es fijo y siempre visible desde el breakpoint lg. Por debajo
  // de lg se comporta como un drawer: oculto por defecto, se abre con el
  // botón hamburguesa del header y se cierra con Escape, con click en el
  // fondo oscuro, o al elegir una opción de navegación.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  const sidebarRef = useRef(null);
  const menuBtnRef = useRef(null);

  // Cierra el drawer automáticamente al navegar a otra ruta (por ejemplo,
  // tras tocar "Mis Eventos" en mobile).
  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuAbierto) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setMenuAbierto(false);
        menuBtnRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuAbierto]);

  // El focus trap solo debe actuar cuando el sidebar se comporta como
  // drawer modal (mobile + abierto). En desktop el sidebar es parte fija
  // del layout, no un diálogo, así que no atrapamos el foco ahí.
  useFocusTrap(menuAbierto, sidebarRef);

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#181b27]">
      {/* Fondo oscuro del drawer: solo aparece en mobile mientras el menú
          está abierto; en lg y superior el sidebar ya es fijo y esto nunca
          se renderiza como bloqueante. */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-[#181b27]/40 z-40 lg:hidden"
          aria-hidden="true"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        id="sidebar-nav"
        role="navigation"
        aria-label="Navegación principal"
        className={`fixed left-0 top-0 h-full w-72 bg-white border-r border-[#e5e7f8] shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-50 flex flex-col gap-6 py-6 transition-transform duration-200 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={CARD_HEADER_ICON}>
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">auto_schedule</span>
            </div>
            <span className={`${FONT_HEADLINE} text-xl font-bold tracking-tight`}>Planify</span>
          </div>
          {/* Botón de cierre, solo visible en mobile: en desktop el sidebar
              siempre está abierto, así que no tiene sentido cerrarlo. */}
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-[#7a7580] hover:bg-[#f2f3ff] hover:text-[#181b27] transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2"
            onClick={() => { setMenuAbierto(false); menuBtnRef.current?.focus(); }}
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 px-4">
          {NAV_ITEMS.map((item) =>
            item.disabled ? (
              <span
                key={item.label}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-[#49454f] cursor-not-allowed select-none"
                title="Todavía no está disponible"
                aria-disabled="true"
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider">Pronto</span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive ? 'bg-[#7c69a5] text-white shadow-sm' : 'text-[#49454f] hover:bg-[#f2f3ff] hover:text-[#181b27]'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-[#e5e7f8] shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-30 flex items-center justify-between lg:justify-end px-4 sm:px-8">
        {/* Botón hamburguesa: solo existe por debajo de lg, ya que en
            desktop el sidebar siempre está a la vista. */}
        <button
          ref={menuBtnRef}
          type="button"
          className="lg:hidden p-2 -ml-2 rounded-lg text-[#49454f] hover:bg-[#f2f3ff] hover:text-[#181b27] transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          aria-controls="sidebar-nav"
        >
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">menu</span>
        </button>

        {/* Sin datos de usuario reales: el login (US-11) es de un sprint
            futuro, así que no hay nombre ni sesión que mostrar todavía. */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#eaddff] text-[#63518b] flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">person</span>
          </div>
          <span className="text-sm font-semibold text-[#181b27] hidden sm:inline">Organizador/a</span>
        </div>
      </header>

      <div className="lg:pl-72 pt-16">
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}