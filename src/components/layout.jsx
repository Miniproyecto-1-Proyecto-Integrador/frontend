import { NavLink, Outlet } from 'react-router-dom';
import { CARD_HEADER_ICON, FONT_HEADLINE } from './ui';

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
  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#181b27]">
      <aside className="fixed left-0 top-0 h-full w-72 bg-white border-r border-[#e5e7f8] shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-50 flex flex-col gap-6 py-6">
        <div className="px-6 flex items-center gap-3">
          <div className={CARD_HEADER_ICON}>
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">auto_schedule</span>
          </div>
          <span className={`${FONT_HEADLINE} text-xl font-bold tracking-tight`}>Planify</span>
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

      <header className="fixed top-0 left-72 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-[#e5e7f8] shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-40 flex items-center justify-end px-8">
        {/* Sin datos de usuario reales: el login (US-11) es de un sprint
            futuro, así que no hay nombre ni sesión que mostrar todavía. */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#eaddff] text-[#63518b] flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">person</span>
          </div>
          <span className="text-sm font-semibold text-[#181b27] hidden sm:inline">Organizador/a</span>
        </div>
      </header>

      <div className="pl-72 pt-16">
        <main className="w-full max-w-7xl mx-auto px-6 sm:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}