import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listEvents } from './services/events';
import {
  FONT_HEADLINE, CARD, CARD_HEADER_ICON, ERROR, BOTON_PRINCIPAL,
} from './components/ui';

function formatFechaHora(iso) {
  if (!iso) return '';
  const [fecha, resto] = iso.split('T');
  const hora = (resto || '').slice(0, 5);
  return `${fecha} ${hora}`;
}

// Listado plano de eventos: solo GET /api/events/ + link al detalle.
// Esta vista existe solo para poder navegar a los eventos ya creados sin saber su id de memoria.
export default function MisEventos() {
  const [status, setStatus] = useState('loading'); // loading | ok | empty | error
  const [eventos, setEventos] = useState([]);

  // Búsqueda es puramente client-side sobre los eventos ya cargados: no
  // dispara ninguna petición nueva ni toca el flujo de carga de arriba.
  const [busqueda, setBusqueda] = useState('');

  // Foco en el <h1> al terminar de cargar: en una SPA no hay recarga de
  // página, así que sin esto un usuario de lector de pantalla no se entera
  // de que "navegó" a esta vista (mismo patrón que en el detalle del evento).
  const headingRef = useRef(null);

  const cargar = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await listEvents();
      setEventos(data);
      setStatus(data.length === 0 ? 'empty' : 'ok');
    } catch (err) {
      setStatus('error');
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (status === 'ok' || status === 'empty') headingRef.current?.focus();
  }, [status]);

  const eventosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return eventos;
    return eventos.filter((ev) =>
      [ev.nombre, ev.tipo, ev.lugar].some((campo) => (campo || '').toLowerCase().includes(q))
    );
  }, [eventos, busqueda]);

  if (status === 'loading') {
    return <p className="px-4 py-3" role="status">Cargando eventos…</p>;
  }

  if (status === 'error') {
    return (
      <div className={CARD}>
        <p className={ERROR} role="alert">No pudimos cargar tus eventos. Revisa tu conexión.</p>
        <button type="button" className={`${BOTON_PRINCIPAL} self-start`} onClick={cargar}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Cabecera con un leve acento decorativo detrás del título — el único
          "momento" visual de la página; el resto se mantiene tranquilo. */}
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-gradient-to-br from-[#d2e4ff] via-[#e4d9ff] to-transparent opacity-60 blur-2xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -right-2 -top-2 material-symbols-outlined text-[110px] text-[#63518b]/[0.06] select-none"
          aria-hidden="true"
        >
          celebration
        </span>

        <div className="relative flex flex-col gap-1 py-1">
          {/* tabIndex=-1: no entra en el orden de tab, solo recibe foco por programa */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={`${FONT_HEADLINE} text-2xl sm:text-3xl font-extrabold text-[#181b27] tracking-tight focus:outline-none`}
          >
            Mis eventos
          </h1>
          {status === 'ok' && (
            <p className="text-sm text-[#7a7580]">
              {eventos.length} {eventos.length === 1 ? 'evento registrado' : 'eventos registrados'}
            </p>
          )}
        </div>
      </div>

      {status === 'empty' && (
        <div className={`${CARD} items-center text-center py-10`}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f2f3ff] to-[#d2e4ff] flex items-center justify-center text-[#63518b]">
            <span className="material-symbols-outlined text-[28px]" aria-hidden="true">event_available</span>
          </div>
          <p className="text-[#49454f] italic">Aún no tienes eventos creados.</p>
          <Link to="/crear" className={`${BOTON_PRINCIPAL} self-center`}>Crear evento</Link>
        </div>
      )}

      {status === 'ok' && (
        <>
          {/* Barra de búsqueda: solo filtra localmente lo que ya se cargó */}
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#7a7580] pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, tipo o lugar…"
              aria-label="Buscar en mis eventos"
              className="w-full rounded-full border border-[#ebedfe] bg-[#faf8ff] pl-11 pr-4 py-3 text-sm text-[#181b27] placeholder:text-[#7a7580] outline-none transition-shadow focus:border-[#63518b] focus:ring-[3px] focus:ring-[#63518b]/20"
            />
          </div>

          {eventosFiltrados.length === 0 ? (
            <div className={`${CARD} items-center text-center py-8`}>
              <span className="material-symbols-outlined text-[28px] text-[#7a7580]" aria-hidden="true">search_off</span>
              <p className="text-[#49454f] italic">
                Ningún evento coincide con "{busqueda}".
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" aria-label={`${eventosFiltrados.length} eventos`}>
              {eventosFiltrados.map((ev) => (
                <li key={ev.id}>
                  <Link
                    to={`/evento/${ev.id}`}
                    className={`${CARD} group block hover:border-[#63518b] hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 no-underline`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${CARD_HEADER_ICON} transition-colors group-hover:bg-[#63518b] group-hover:text-white`}>
                        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">celebration</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`${FONT_HEADLINE} font-bold text-[#181b27] truncate`}>{ev.nombre}</span>
                        <span className="text-xs text-[#7a7580] truncate">
                          {ev.tipo} · {formatFechaHora(ev.fecha_hora)} · {ev.lugar}
                        </span>
                      </div>
                      <span
                        className="material-symbols-outlined ml-auto text-[20px] text-[#7a7580] opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
                        aria-hidden="true"
                      >
                        arrow_forward
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}