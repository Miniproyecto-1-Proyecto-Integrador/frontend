import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    BOTON_PRINCIPAL, BOTON_SECUNDARIO,
    CARD,
    FONT_HEADLINE,
    LABEL,
} from './components/ui';
import { esFalloDeRed, MENSAJE_ERROR_RED } from './helpers/errors';
import { getHoy, listEvents, updateSubtask } from './services/events';

// El orden de los grupos en pantalla es fijo. El orden DENTRO de cada grupo
// lo decide el backend: aquí no se reordena nada.
const GRUPOS = [
  { clave: 'vencidas', titulo: 'Vencidas', icon: 'warning', acento: 'text-[#ba1a1a]' },
  { clave: 'hoy', titulo: 'Hoy', icon: 'today', acento: 'text-[#63518b]' },
  { clave: 'proximas', titulo: 'Próximas', icon: 'schedule', acento: 'text-[#49454f]' },
];

const OPCIONES_ESTADO = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'hecha', texto: 'Hechas' },
  { valor: 'todas', texto: 'Todas' },
];

const SELECT =
  'w-full rounded-xl border border-[#e5e7f8] bg-white px-3 py-2.5 text-sm text-[#181b27] ' +
  'focus:border-[#63518b] focus:ring-2 focus:ring-[#63518b]/20 outline-none ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2';

// "2026-09-20" -> "20/09/2026" sin pasar por Date (evita el corrimiento de zona horaria).
function formatFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Prioriza el mensaje que manda el back; solo los fallos de red usan el genérico.
function mensajeDeError(err) {
  if (esFalloDeRed(err)) return MENSAJE_ERROR_RED;
  const campo = err?.fieldErrors && Object.values(err.fieldErrors)[0];
  if (Array.isArray(campo) && campo[0]) return campo[0];
  return err?.message || 'No pudimos cargar tus gestiones. Intenta de nuevo.';
}

export default function Hoy() {
  // Los filtros viven en la URL: se pueden recargar, compartir y volver con "atrás".
  const [params, setParams] = useSearchParams();
  const estadoParam = params.get('estado') || '';
  const eventoParam = params.get('evento') || '';
  const hayFiltros = estadoParam !== '' || eventoParam !== '';

  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null); // { mensaje, filtroInvalido }
  const [eventos, setEventos] = useState([]);
  const [reglaAbierta, setReglaAbierta] = useState(false);
  const [aviso, setAviso] = useState(null); // { texto, id }
  const [errorAccion, setErrorAccion] = useState('');
  const [guardandoId, setGuardandoId] = useState(null);

  const headingRef = useRef(null);
  const avisoRef = useRef(null);
  const reqId = useRef(0);
  const yaEnfocado = useRef(false);

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      const id = ++reqId.current; // descarta respuestas viejas si cambian los filtros rápido
      if (!silencioso) setStatus('loading');
      try {
        const res = await getHoy({ estado: estadoParam, evento: eventoParam });
        if (id !== reqId.current) return;
        setData(res);
        setError(null);
        setStatus('ok');
      } catch (err) {
        if (id !== reqId.current) return;
        setError({
          mensaje: mensajeDeError(err),
          // 400 / 404 = el filtro de la URL es inválido: reintentar no sirve, hay que limpiarlo.
          filtroInvalido: err.status === 400 || err.status === 404,
        });
        setStatus('error');
      }
    },
    [estadoParam, eventoParam]
  );

  useEffect(() => { cargar(); }, [cargar]);

  // Lista de eventos solo para poblar el filtro. Si falla, el filtro queda en "Todos".
  useEffect(() => {
    listEvents().then(setEventos).catch(() => {});
  }, []);

  // Foco en el <h1> la primera vez que termina de cargar (lectores de pantalla:
  // en una SPA no hay recarga que anuncie la nueva vista). No se repite al filtrar,
  // para no arrancarle el foco al select que la persona está usando.
  useEffect(() => {
    if (status !== 'loading' && !yaEnfocado.current) {
      yaEnfocado.current = true;
      headingRef.current?.focus();
    }
  }, [status]);

  // Tras marcar una gestión, el botón desaparece de la lista (puede salir del filtro):
  // llevamos el foco al aviso para no dejar al usuario de teclado en el vacío.
  useEffect(() => {
    if (aviso) avisoRef.current?.focus();
  }, [aviso]);

  function cambiarFiltro(clave, valor, valorPorDefecto = '') {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (valor && valor !== valorPorDefecto) next.set(clave, valor);
      else next.delete(clave);
      return next;
    });
    setAviso(null);
    setErrorAccion('');
  }

  function limpiarFiltros() {
    setParams(new URLSearchParams());
    setAviso(null);
    setErrorAccion('');
  }

  async function cambiarEstado(gestion) {
    const nuevo = gestion.estado === 'hecha' ? 'pendiente' : 'hecha';
    setGuardandoId(gestion.id);
    setErrorAccion('');
    try {
      await updateSubtask(gestion.evento_id, gestion.id, { estado: nuevo });
      await cargar({ silencioso: true }); // el back re-agrupa y re-ordena, no lo hacemos aquí
      setAviso({
        texto: `"${gestion.titulo}" quedó como ${nuevo === 'hecha' ? 'hecha' : 'pendiente'}.`,
        id: Date.now(),
      });
    } catch (err) {
      setErrorAccion(mensajeDeError(err));
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* ---------- Cabecera ---------- */}
      <div className="flex flex-col gap-1 py-1">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={`${FONT_HEADLINE} text-2xl sm:text-3xl font-extrabold text-[#181b27] tracking-tight focus:outline-none`}
        >
          Hoy
        </h1>
        {data && (
          <p className="text-sm text-[#49454f]">
            {formatFecha(data.hoy)} · {data.total} {data.total === 1 ? 'gestión' : 'gestiones'}
          </p>
        )}
      </div>

      {/* ---------- C3: regla de prioridad, tal cual llega del backend ---------- */}
      {data?.regla_prioridad && (
        <div>
          <button
            type="button"
            className={`${BOTON_SECUNDARIO} inline-flex items-center gap-2`}
            aria-expanded={reglaAbierta}
            aria-controls="regla-prioridad"
            onClick={() => setReglaAbierta((v) => !v)}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">help</span>
            ¿Cómo se ordena?
          </button>
          {reglaAbierta && (
            <p
              id="regla-prioridad"
              className="mt-3 rounded-xl border border-[#e5e7f8] bg-[#f2f3ff] p-4 text-sm text-[#181b27]"
            >
              {data.regla_prioridad}
            </p>
          )}
        </div>
      )}

      {/* ---------- US-05: filtros ---------- */}
      <form
        aria-label="Filtros de gestiones"
        onSubmit={(e) => e.preventDefault()}
        className={`${CARD} !gap-4 sm:flex-row sm:items-end`}
      >
        <div className="flex-1">
          <label htmlFor="filtro-estado" className={LABEL}>Estado</label>
          <select
            id="filtro-estado"
            className={SELECT}
            value={estadoParam || 'pendiente'}
            onChange={(e) => cambiarFiltro('estado', e.target.value, 'pendiente')}
          >
            {OPCIONES_ESTADO.map((o) => (
              <option key={o.valor} value={o.valor}>{o.texto}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="filtro-evento" className={LABEL}>Evento</label>
          <select
            id="filtro-evento"
            className={SELECT}
            value={eventoParam}
            onChange={(e) => cambiarFiltro('evento', e.target.value)}
          >
            <option value="">Todos los eventos</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={String(ev.id)}>{ev.nombre}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={BOTON_SECUNDARIO}
          onClick={limpiarFiltros}
          disabled={!hayFiltros}
        >
          Limpiar filtros
        </button>
      </form>

      {/* Aviso tras marcar hecha/pendiente (también lo anuncia el lector de pantalla) */}
      {aviso && (
        <p
          key={aviso.id}
          ref={avisoRef}
          tabIndex={-1}
          role="status"
          className="rounded-xl border border-[#e5e7f8] bg-white px-4 py-3 text-sm text-[#181b27] focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b]"
        >
          {aviso.texto}
        </p>
      )}
      {errorAccion && (
        <p role="alert" className="rounded-xl border border-[#ba1a1a]/40 bg-[#ffdad6]/40 px-4 py-3 text-sm text-[#93000a]">
          {errorAccion}
        </p>
      )}

      {/* ---------- C4: cargando / error / vacío / lista ---------- */}
      {status === 'loading' && (
        <p className="px-1 py-3 text-[#49454f]" role="status">Cargando gestiones…</p>
      )}

      {status === 'error' && (
        <div role="alert" className={`${CARD} items-start`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-[#ba1a1a]" aria-hidden="true">error</span>
            <p className="text-[#181b27]">{error?.mensaje}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {error?.filtroInvalido ? (
              <button type="button" className={BOTON_PRINCIPAL} onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            ) : (
              <button type="button" className={BOTON_PRINCIPAL} onClick={() => cargar()}>
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}

      {status === 'ok' && data.total === 0 && (
        <div className={`${CARD} items-center text-center py-10`}>
          <span className="material-symbols-outlined text-[32px] text-[#7a7580]" aria-hidden="true">
            {hayFiltros ? 'search_off' : 'task_alt'}
          </span>
          <p className="text-[#49454f] italic">
            {hayFiltros
              ? 'Ninguna gestión coincide con estos filtros.'
              : 'No tienes gestiones pendientes.'}
          </p>
          {hayFiltros ? (
            <button type="button" className={BOTON_PRINCIPAL} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          ) : (
            <Link to="/evento" className={BOTON_PRINCIPAL}>Ver mis eventos</Link>
          )}
        </div>
      )}

      {status === 'ok' && data.total > 0 && (
        <div className="flex flex-col gap-8">
          {GRUPOS.map(({ clave, titulo, icon, acento }) => {
            const items = data.grupos?.[clave] ?? [];
            if (items.length === 0) return null;
            return (
              <section key={clave} aria-labelledby={`grupo-${clave}`} className="flex flex-col gap-3">
                <h2
                  id={`grupo-${clave}`}
                  className={`${FONT_HEADLINE} flex items-center gap-2 text-lg font-bold ${acento}`}
                >
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icon}</span>
                  {titulo} ({items.length})
                </h2>
                <ul className="flex flex-col gap-3">
                  {items.map((g) => {
                    const hecha = g.estado === 'hecha';
                    return (
                      <li key={g.id} className={`${CARD} !p-4 sm:!p-5 !gap-3 sm:flex-row sm:items-center`}>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className={`${FONT_HEADLINE} font-bold text-[#181b27] ${hecha ? 'line-through' : ''}`}>
                            {g.titulo}
                          </span>
                          <span className="text-sm text-[#49454f]">
                            <Link
                              to={`/evento/${g.evento_id}`}
                              className="font-semibold text-[#63518b] underline underline-offset-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2"
                            >
                              {g.evento_nombre}
                            </Link>
                            {' · '}
                            {formatFecha(g.fecha_objetivo)}
                            {' · '}
                            {Number(g.horas_estimadas)} h
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#49454f]">
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                              {hecha ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            {hecha ? 'Hecha' : 'Pendiente'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={BOTON_SECUNDARIO}
                          disabled={guardandoId === g.id}
                          onClick={() => cambiarEstado(g)}
                          aria-label={`${hecha ? 'Marcar como pendiente' : 'Marcar como hecha'}: ${g.titulo}`}
                        >
                          {guardandoId === g.id
                            ? 'Guardando…'
                            : hecha ? 'Marcar pendiente' : 'Marcar hecha'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}