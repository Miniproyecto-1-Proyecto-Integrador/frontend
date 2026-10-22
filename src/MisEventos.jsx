import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProgresoEvento, listEvents } from './services/events';
import {
  FONT_HEADLINE, CARD, CARD_HEADER_ICON, BOTON_PRINCIPAL, BOTON_SECUNDARIO,
  PILL_BASE, PILL_ACTIVE, PILL_INACTIVE,
  SkeletonBloque, SkeletonLista,
} from './components/ui';
import { DoodleCalendario } from './components/Doodles';
import SuccessModal from './components/SuccessCard';
import { useTituloPagina } from './helpers/useTituloPagina';

const FILTROS = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'proximos', texto: 'Próximos' },
  { valor: 'pasados', texto: 'Pasados' },
];

const ORDENES = [
  { valor: 'proximos-primero', texto: 'Próximos primero' },
  { valor: 'fecha-asc', texto: 'Fecha: más cercana' },
  { valor: 'fecha-desc', texto: 'Fecha: más lejana' },
  { valor: 'nombre', texto: 'Nombre (A–Z)' },
];

const SELECT =
  'rounded-xl border border-[#e5e7f8] bg-white px-3 py-2 text-sm text-[#181b27] ' +
  'focus:border-[#63518b] focus:ring-2 focus:ring-[#63518b]/20 outline-none ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2';

function formatFechaHora(iso) {
  if (!iso) return '';
  const [fecha, resto] = iso.split('T');
  const hora = (resto || '').slice(0, 5);
  return `${fecha} ${hora}`;
}

// Días que faltan para la fecha del evento (negativo = ya pasó). Se compara solo el día,
// leyendo año-mes-día del texto ISO para evitar el corrimiento por zona horaria.
function diasHasta(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const hoy = new Date();
  const evento = Date.UTC(y, m - 1, d);
  const actual = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((evento - actual) / 86400000);
}

// El estado nunca se comunica solo con color: siempre lleva ícono + texto.
function plazoDe(dias) {
  if (dias === null) return null;
  if (dias < 0) {
    return {
      texto: dias === -1 ? 'Fue ayer' : `Hace ${-dias} días`,
      icon: 'history',
      clase: 'bg-[#f2f3ff] text-[#49454f] border-[#49454f]/20',
    };
  }
  if (dias === 0) return { texto: 'Hoy', icon: 'alarm', clase: 'bg-[#ffe1d3] text-[#8a2c00] border-[#8a2c00]/30' };
  if (dias === 1) return { texto: 'Mañana', icon: 'alarm', clase: 'bg-[#ffe1d3] text-[#8a2c00] border-[#8a2c00]/30' };
  if (dias <= 7) {
    return { texto: `En ${dias} días`, icon: 'schedule', clase: 'bg-[#fff4d6] text-[#6b4a00] border-[#6b4a00]/25' };
  }
  return { texto: `En ${dias} días`, icon: 'event', clase: 'bg-[#eaddff] text-[#3d3163] border-[#3d3163]/20' };
}

function PlazoChip({ iso }) {
  const plazo = plazoDe(diasHasta(iso));
  if (!plazo) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${plazo.clase}`}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{plazo.icon}</span>
      {plazo.texto}
    </span>
  );
}

// Mini barra de progreso de preparación (mismo dato que /progreso: subtareas hechas / total).
function MiniProgreso({ p }) {
  if (!p || p.status === 'loading') {
    return <SkeletonBloque className="h-2 w-full !rounded-full" />;
  }
  if (p.status === 'error') {
    return <p className="text-xs text-[#625d66]">Progreso no disponible</p>;
  }
  const total = Number(p.datos?.total_subtareas) || 0;
  if (total === 0) {
    return <p className="text-xs italic text-[#625d66]">Sin gestiones asignadas todavía</p>;
  }
  const hechas = Number(p.datos.subtareas_hechas) || 0;
  const porcentaje = Number(p.datos.porcentaje) || 0;
  const ancho = Math.min(100, Math.max(0, porcentaje));
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={`Progreso de preparación: ${porcentaje}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5e7f8]"
      >
        <div
          className="h-full rounded-full bg-[#63518b] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${ancho}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-xs font-semibold text-[#49454f]">
        {hechas} de {total} · {porcentaje}%
      </span>
    </div>
  );
}

function ordenar(lista, orden) {
  const porFecha = (a, b) => (a.fecha_hora || '').localeCompare(b.fecha_hora || '');
  const copia = [...lista];
  if (orden === 'fecha-asc') return copia.sort(porFecha);
  if (orden === 'fecha-desc') return copia.sort((a, b) => porFecha(b, a));
  if (orden === 'nombre') {
    return copia.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
  }
  // proximos-primero: los que vienen, del más cercano al más lejano; luego los pasados, del más reciente atrás.
  const esPasado = (ev) => (diasHasta(ev.fecha_hora) ?? 0) < 0;
  const proximos = copia.filter((ev) => !esPasado(ev)).sort(porFecha);
  const pasados = copia.filter(esPasado).sort((a, b) => porFecha(b, a));
  return [...proximos, ...pasados];
}

// Listado de eventos: GET /api/events/ + link al detalle. Filtros (próximos / pasados), orden y
// una mini barra de progreso por evento (GET /api/events/:id/progreso/, igual que /progreso).
export default function MisEventos() {
  useTituloPagina('Mis eventos');
  const [status, setStatus] = useState('loading'); // loading | ok | empty | error
  const [eventos, setEventos] = useState([]);
  const [progresos, setProgresos] = useState({}); // { [id]: { status, datos } }

  // Filtro y orden viven en la URL (se pueden recargar y volver con "atrás").
  const [params, setParams] = useSearchParams();
  const filtroParam = params.get('filtro');
  const ordenParam = params.get('orden');
  const filtro = FILTROS.some((f) => f.valor === filtroParam) ? filtroParam : 'todos';
  const orden = ORDENES.some((o) => o.valor === ordenParam) ? ordenParam : 'proximos-primero';

  // Búsqueda es puramente client-side sobre los eventos ya cargados: no
  // dispara ninguna petición nueva ni toca el flujo de carga de arriba.
  const [busqueda, setBusqueda] = useState('');

  // Foco en el <h1> al terminar de cargar: en una SPA no hay recarga de
  // página, así que sin esto un usuario de lector de pantalla no se entera
  // de que "navegó" a esta vista (mismo patrón que en el detalle del evento).
  const headingRef = useRef(null);
  const generacion = useRef(0); // descarta respuestas de progreso de cargas anteriores

  const cargarProgreso = useCallback(async (id, gen) => {
    try {
      const datos = await getProgresoEvento(id);
      if (gen !== generacion.current) return;
      setProgresos((p) => ({ ...p, [id]: { status: 'ok', datos } }));
    } catch {
      if (gen !== generacion.current) return;
      setProgresos((p) => ({ ...p, [id]: { status: 'error', datos: null } }));
    }
  }, []);

  const cargar = useCallback(async () => {
    const gen = ++generacion.current;
    setStatus('loading');
    setProgresos({});
    try {
      const data = await listEvents();
      if (gen !== generacion.current) return;
      setEventos(data);
      setStatus(data.length === 0 ? 'empty' : 'ok');
      // El progreso llega después, tarjeta por tarjeta: la lista no espera por él.
      data.forEach((ev) => cargarProgreso(ev.id, gen));
    } catch (err) {
      if (gen !== generacion.current) return;
      setStatus('error');
    }
  }, [cargarProgreso]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (status === 'ok' || status === 'empty') headingRef.current?.focus();
  }, [status]);

  function cambiarParam(clave, valor, valorPorDefecto) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (valor && valor !== valorPorDefecto) next.set(clave, valor);
        else next.delete(clave);
        return next;
      },
      { replace: true }
    );
  }

  const conteos = useMemo(() => {
    const pasados = eventos.filter((ev) => (diasHasta(ev.fecha_hora) ?? 0) < 0).length;
    return { todos: eventos.length, pasados, proximos: eventos.length - pasados };
  }, [eventos]);

  const eventosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const porFiltro = eventos.filter((ev) => {
      const pasado = (diasHasta(ev.fecha_hora) ?? 0) < 0;
      if (filtro === 'proximos') return !pasado;
      if (filtro === 'pasados') return pasado;
      return true;
    });
    const porTexto = !q
      ? porFiltro
      : porFiltro.filter((ev) =>
          [ev.nombre, ev.tipo, ev.lugar].some((campo) => (campo || '').toLowerCase().includes(q))
        );
    return ordenar(porTexto, orden);
  }, [eventos, busqueda, filtro, orden]);

  function limpiar() {
    setBusqueda('');
    setParams(new URLSearchParams(), { replace: true });
  }

  const hayFiltros = busqueda.trim() !== '' || filtro !== 'todos';

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Cabecera con un leve acento decorativo detrás del título — el único
          "momento" visual de la página; el resto se mantiene tranquilo. */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-gradient-to-br from-[#d2e4ff] via-[#e4d9ff] to-transparent opacity-60 blur-2xl" />
        </div>

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
            <p className="text-sm text-[#625d66]">
              {eventos.length} {eventos.length === 1 ? 'evento registrado' : 'eventos registrados'}
            </p>
          )}
        </div>
      </div>

      {status === 'loading' && <SkeletonLista filas={3} etiqueta="Cargando eventos…" />}

      {status === 'empty' && (
        <div className={`${CARD} items-center text-center py-10`}>
          <DoodleCalendario className="h-24 w-32" />
          <p className="text-[#49454f] italic">Aún no tienes eventos creados.</p>
          <Link to="/crear" className={`${BOTON_PRINCIPAL} self-center`}>Crear evento</Link>
        </div>
      )}

      {status === 'ok' && (
        <>
          {/* Barra de búsqueda: solo filtra localmente lo que ya se cargó */}
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#625d66] pointer-events-none"
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
              className="w-full rounded-full border border-[#ebedfe] bg-[#faf8ff] pl-11 pr-4 py-3 text-sm text-[#181b27] placeholder:text-[#625d66] outline-none transition-shadow focus:border-[#63518b] focus:ring-[3px] focus:ring-[#63518b]/20 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#63518b]"
            />
          </div>

          {/* Filtro por fecha + orden */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label="Filtrar eventos por fecha" className="flex flex-wrap gap-2">
              {FILTROS.map((f) => {
                const activo = filtro === f.valor;
                return (
                  <button
                    key={f.valor}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => cambiarParam('filtro', f.valor, 'todos')}
                    className={`${PILL_BASE} ${activo ? PILL_ACTIVE : PILL_INACTIVE}`}
                  >
                    {f.texto} ({conteos[f.valor]})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="orden-eventos" className="text-sm font-semibold text-[#181b27]">
                Ordenar
              </label>
              <select
                id="orden-eventos"
                className={SELECT}
                value={orden}
                onChange={(e) => cambiarParam('orden', e.target.value, 'proximos-primero')}
              >
                {ORDENES.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.texto}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Anuncia el resultado a lectores de pantalla cuando cambia el filtro o la búsqueda */}
          <p role="status" className="sr-only">
            {eventosFiltrados.length} {eventosFiltrados.length === 1 ? 'evento' : 'eventos'}
          </p>

          {eventosFiltrados.length === 0 ? (
            <div className={`${CARD} items-center text-center py-8`}>
              <span className="material-symbols-outlined text-[28px] text-[#625d66]" aria-hidden="true">search_off</span>
              <p className="text-[#49454f] italic">
                {busqueda.trim() !== ''
                  ? `Ningún evento coincide con "${busqueda}".`
                  : filtro === 'proximos'
                    ? 'No tienes eventos próximos.'
                    : 'No tienes eventos pasados.'}
              </p>
              {hayFiltros && (
                <button type="button" className={BOTON_SECUNDARIO} onClick={limpiar}>
                  Ver todos los eventos
                </button>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-3" aria-label={`${eventosFiltrados.length} eventos`}>
              {eventosFiltrados.map((ev) => (
                <li key={ev.id}>
                  <Link
                    to={`/evento/${ev.id}`}
                    className={`${CARD} !gap-3 group block hover:border-[#63518b] hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 no-underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#63518b]`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${CARD_HEADER_ICON} transition-colors group-hover:bg-[#63518b] group-hover:text-white`}>
                        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">celebration</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`${FONT_HEADLINE} font-bold text-[#181b27] truncate`}>{ev.nombre}</span>
                        <span className="text-xs text-[#625d66] truncate">
                          {ev.tipo} · {formatFechaHora(ev.fecha_hora)} · {ev.lugar}
                        </span>
                      </div>
                      <div className="ml-auto flex items-center gap-2 pl-2">
                        <PlazoChip iso={ev.fecha_hora} />
                        <span
                          className="material-symbols-outlined hidden sm:block text-[20px] text-[#625d66] -translate-x-1 transition-transform group-hover:translate-x-0 group-focus-visible:translate-x-0"
                          aria-hidden="true"
                        >
                          arrow_forward
                        </span>
                      </div>
                    </div>
                    <MiniProgreso p={progresos[ev.id]} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <SuccessModal
        open={status === 'error'}
        variant="error"
        titulo="No se pudieron cargar tus eventos"
        mensaje="Revisa tu conexión e inténtalo de nuevo."
        onCerrar={cargar}
      />
    </div>
  );
}
