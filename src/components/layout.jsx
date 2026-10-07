import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFocusTrap } from '../helpers/UseFocusTrap';
import { CARD_HEADER_ICON, FONT_HEADLINE } from './ui';

// "Hoy" y "Progreso y Métricas" todavía no existen como pantallas —
// se muestran deshabilitadas para no simular navegación a algo que no
// está construido (US-04/US-10, sprints futuros).
// "Mis Eventos" sí está activa: apunta a /evento, un listado plano
// (GET /api/events/) que no implementa nada de US-04 — solo permite
// navegar a los eventos que ya existen.
const NAV_ITEMS = [
  { to: '/hoy', label: 'Hoy', icon: 'today' },
  { to: '/crear', label: 'Crear Evento', icon: 'add_circle' },
  { to: '/evento', label: 'Mis Eventos', icon: 'event_available' },
  { to: '/configuracion', label: 'Configuración', icon: 'settings' },
  { label: 'Progreso y Métricas', icon: 'query_stats', disabled: true },
];

export default function Layout() {
  // El sidebar es fijo y siempre visible desde el breakpoint lg. Por debajo
  // de lg se comporta como un drawer: oculto por defecto, se abre con el
  // botón hamburguesa del header y se cierra con Escape, con click en el
  // fondo oscuro, o al elegir una opción de navegación.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function cerrarSesion() {
    logout();
    navigate('/login', { replace: true });
  }

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

    // Menú del perfil (nombre + flecha). Es un botón con aria-expanded que
  // muestra u oculta un panel con los datos del usuario y "Cerrar sesión".
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const perfilRef = useRef(null);
  const perfilBtnRef = useRef(null);

  // Se cierra al cambiar de ruta.
  useEffect(() => {
    setPerfilAbierto(false);
  }, [location.pathname]);

  // Se cierra con Escape (devolviendo el foco al botón), con clic fuera
  // o cuando el foco del teclado sale del menú.
  useEffect(() => {
    if (!perfilAbierto) return;

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setPerfilAbierto(false);
        perfilBtnRef.current?.focus();
      }
    }
    function onFueraDelMenu(e) {
      if (perfilRef.current && !perfilRef.current.contains(e.target)) {
        setPerfilAbierto(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onFueraDelMenu);
    document.addEventListener('focusin', onFueraDelMenu);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onFueraDelMenu);
      document.removeEventListener('focusin', onFueraDelMenu);
    };
  }, [perfilAbierto]);

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
          aria-controls="sidebar-nav">
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">menu</span>
        </button>

        <div ref={perfilRef} className="relative">
          <button
            ref={perfilBtnRef}
            type="button"
            onClick={() => setPerfilAbierto((v) => !v)}
            aria-expanded={perfilAbierto}
            aria-controls="menu-perfil"
            aria-label={`Menú de ${user?.username || 'usuario'}`}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[#f2f3ff] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#63518b]">
            <span className="w-9 h-9 rounded-full bg-[#eaddff] text-[#63518b] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">person</span>
            </span>
            <span className="text-sm font-semibold text-[#181b27] hidden sm:inline">
              {user?.username || 'Organizador/a'}
            </span>
            <span
              className={`material-symbols-outlined text-[20px] text-[#49454f] transition-transform ${perfilAbierto ? 'rotate-180' : ''}`}
              aria-hidden="true">
              expand_more
            </span>
          </button>

          {perfilAbierto && (
            <div
              id="menu-perfil"
              className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[#e5e7f8] bg-white p-2 shadow-[0_8px_30px_-8px_rgba(99,81,139,0.25)]">
              <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                <span className="w-10 h-10 flex-shrink-0 rounded-full bg-[#eaddff] text-[#63518b] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">person</span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#181b27]">{user?.username}</p>
                  <p className="truncate text-xs text-[#49454f]">{user?.email}</p>
                </div>
              </div>

              <div className="my-1 h-px bg-[#e5e7f8]" aria-hidden="true" />

              <button
                type="button"
                onClick={cerrarSesion}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#93000a] transition-colors hover:bg-[#ffdad6]/50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[#ba1a1a]">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
                Cerrar sesión
              </button>
            </div>
          )}
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