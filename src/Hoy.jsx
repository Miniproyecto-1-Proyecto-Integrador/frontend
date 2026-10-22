import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    BOTON_PRINCIPAL, BOTON_SECUNDARIO,
    CARD,
    FONT_HEADLINE,
    LABEL,
    SkeletonLista,
} from './components/ui';
import { esFalloDeRed, MENSAJE_ERROR_RED } from './helpers/errors';
import { GestionEstado } from './components/EstadoGestion';
import { MC } from './helpers/microcopy';
import { useTituloPagina } from './helpers/useTituloPagina';
import { getHoy, listEvents, listSubtasks, updateSubtask } from './services/events';

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
  { valor: 'pospuesta', texto: 'Pospuestas' },
  { valor: 'todas', texto: 'Todas' },
];

const SELECT =
  'w-full rounded-xl border border-[#e5e7f8] bg-white px-3 py-2.5 text-sm text-[#181b27] ' +
  'focus:border-[#63518b] focus:ring-2 focus:ring-[#63518b]/20 outline-none ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2';

// Tras marcar una gestión, la tarjeta se queda visible (tachada, con su nuevo estado) este
// tiempo antes de que /hoy se recargue y la re-agrupe; y este es el tiempo para "Deshacer".
const RETARDO_RECARGA_MS = 1200;
const VENTANA_DESHACER_MS = 6000;

// "2026-09-20" -> "20/09/2026" sin pasar por Date (evita el corrimiento de zona horaria).
function formatFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// /api/hoy/ puede no traer la nota de las gestiones pospuestas. Si falta, se completa con las
// gestiones de ese evento (GET /events/:id/subtasks/, que sí la trae), una consulta por evento.
// Si /api/hoy/ ya incluye `nota`, no se hace ninguna consulta extra.
async function completarNotas(res) {
  const grupos = res?.grupos;
  if (!grupos) return res;
  const faltan = Object.values(grupos).flat().filter((g) => g.estado === 'pospuesta' && g.nota === undefined);
  if (faltan.length === 0) return res;

  const eventoIds = [...new Set(faltan.map((g) => g.evento_id))];
  const listas = await Promise.allSettled(eventoIds.map((id) => listSubtasks(id)));
  const notas = new Map();
  for (const l of listas) {
    if (l.status === 'fulfilled' && Array.isArray(l.value)) {
      l.value.forEach((sub) => notas.set(sub.id, sub.nota ?? ''));
    }
  }
  const completar = (g) =>
    g.estado === 'pospuesta' && g.nota === undefined && notas.has(g.id) ? { ...g, nota: notas.get(g.id) } : g;
  return {
    ...res,
    grupos: Object.fromEntries(Object.entries(grupos).map(([clave, items]) => [clave, items.map(completar)])),
  };
}

// Suma de horas de las gestiones que siguen pendientes de un grupo (carga real).
function horasPendientes(items) {
  const total = items.reduce(
    (acc, g) => (g.estado === 'pendiente' ? acc + (Number(g.horas_estimadas) || 0) : acc),
    0
  );
  return Math.round(total * 100) / 100;
}

// Prioriza el mensaje que manda el back; solo los fallos de red usan el genérico.
function mensajeDeError(err) {
  if (esFalloDeRed(err)) return MENSAJE_ERROR_RED;
  const campo = err?.fieldErrors && Object.values(err.fieldErrors)[0];
  if (Array.isArray(campo) && campo[0]) return campo[0];
  return err?.message || 'No pudimos cargar tus gestiones. Intenta de nuevo.';
}

export default function Hoy() {
  useTituloPagina('Hoy');

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
  const [deshaciendo, setDeshaciendo] = useState(false);

  const headingRef = useRef(null);
  const avisoRef = useRef(null);
  const reqId = useRef(0);
  const yaEnfocado = useRef(false);
  const deshacerBtnRef = useRef(null);
  const timerRecarga = useRef(null);
  const timerDeshacer = useRef(null);
  const cargarRef = useRef(null);

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      const id = ++reqId.current; // descarta respuestas viejas si cambian los filtros rápido
      if (!silencioso) setStatus('loading');
      try {
        const res = await completarNotas(await getHoy({ estado: estadoParam, evento: eventoParam }));
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

  cargarRef.current = cargar;

  // Si cambian los filtros, se cancela cualquier recarga pendiente (usaría los filtros viejos).
  useEffect(() => {
    clearTimeout(timerRecarga.current);
    cargar();
  }, [cargar]);

  // Al salir de la pantalla no debe quedar ningún temporizador vivo.
  useEffect(() => () => {
    clearTimeout(timerRecarga.current);
    clearTimeout(timerDeshacer.current);
  }, []);

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

  // Tras cambiar una gestión, esta puede desaparecer de la lista (sale del filtro):
  // llevamos el foco al aviso para no dejar al usuario de teclado en el vacío.
  useEffect(() => {
    if (aviso) avisoRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aviso?.id]);

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

  // Aplica el cambio en la lista que ya está en pantalla (tachado + chip + horas) sin esperar
  // a la recarga. El orden y el agrupamiento siguen siendo decisión del backend: se resuelven
  // en la recarga que viene justo después.
  function aplicarLocal(actualizada, previa) {
    setData((prev) => {
      if (!prev?.grupos) return prev;
      const grupos = Object.fromEntries(
        Object.entries(prev.grupos).map(([clave, items]) => [
          clave,
          items.map((it) =>
            it.id === previa.id
              ? {
                  ...it,
                  estado: actualizada?.estado ?? it.estado,
                  nota: actualizada && 'nota' in actualizada ? actualizada.nota : it.nota,
                }
              : it
          ),
        ])
      );
      return { ...prev, grupos };
    });
  }

  function programarRecarga(ms) {
    clearTimeout(timerRecarga.current);
    timerRecarga.current = setTimeout(() => cargarRef.current?.({ silencioso: true }), ms);
  }

  // C3: al marcar hecha / pospuesta el backend ya guardó el cambio. Se refleja al instante en la
  // tarjeta, se ofrece "Deshacer" unos segundos y, pasado un momento, se recarga /hoy en silencio
  // para que re-agrupe, re-ordene y baje la carga de horas. `previa` es la gestión ANTES del cambio.
  function alActualizar(previa, actualizada, mensaje) {
    setErrorAccion('');
    clearTimeout(timerDeshacer.current);
    const id = Date.now();
    setAviso({ texto: mensaje, id, previa });
    aplicarLocal(actualizada, previa);
    programarRecarga(RETARDO_RECARGA_MS);
    timerDeshacer.current = setTimeout(() => {
      // Si el foco estaba en "Deshacer", lo pasamos al aviso para no dejarlo en el vacío.
      if (deshacerBtnRef.current && document.activeElement === deshacerBtnRef.current) {
        avisoRef.current?.focus();
      }
      setAviso((a) => (a && a.id === id ? { ...a, previa: null } : a));
    }, VENTANA_DESHACER_MS);
  }

  // Revierte el último cambio con el mismo PATCH que usa el resto de la app.
  async function deshacer() {
    const previa = aviso?.previa;
    if (!previa || deshaciendo) return;
    clearTimeout(timerDeshacer.current);
    clearTimeout(timerRecarga.current);
    setDeshaciendo(true);
    setErrorAccion('');

    const estado = previa.estado || 'pendiente';
    const payload = { estado };
    if (estado === 'pospuesta') payload.nota = previa.nota ?? '';
    else if (estado === 'pendiente') payload.nota = '';

    try {
      const actualizada = await updateSubtask(previa.evento_id, previa.id, payload);
      aplicarLocal(actualizada, previa);
      setAviso({ texto: `Se deshizo el cambio en «${previa.titulo}».`, id: Date.now(), previa: null });
    } catch (err) {
      setErrorAccion(esFalloDeRed(err) ? MENSAJE_ERROR_RED : MC.error.guardar);
    } finally {
      setDeshaciendo(false);
      cargarRef.current?.({ silencioso: true });
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

      {/* Aviso flotante tras cambiar el estado de una gestión: también lo anuncia el lector de
          pantalla, trae "Deshacer" unos segundos y se puede cerrar. */}
      {aviso && (
        <div
          key={aviso.id}
          ref={avisoRef}
          tabIndex={-1}
          role="status"
          className="fixed inset-x-4 bottom-4 z-40 flex items-center gap-3 rounded-xl border border-[#1e5a34]/25 bg-[#eaf7ee] px-4 py-3 text-sm text-[#1e5a34] shadow-lg focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] sm:left-auto sm:right-6 sm:w-96"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">check_circle</span>
          <span className="min-w-0 flex-1">{aviso.texto}</span>
          {aviso.previa && (
            <button
              ref={deshacerBtnRef}
              type="button"
              onClick={deshacer}
              disabled={deshaciendo}
              className="rounded-lg px-2 py-1 text-sm font-bold underline underline-offset-2 hover:bg-[#1e5a34]/10 disabled:opacity-60 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b]"
            >
              {deshaciendo ? 'Deshaciendo…' : 'Deshacer'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Cerrar aviso"
            className="rounded-lg p-1 hover:bg-[#1e5a34]/10 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b]"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>
      )}
      {errorAccion && (
        <p role="alert" className="rounded-xl border border-[#ba1a1a]/40 bg-[#ffdad6]/40 px-4 py-3 text-sm text-[#93000a]">
          {errorAccion}
        </p>
      )}

      {/* ---------- C4: cargando / error / vacío / lista ---------- */}
      {status === 'loading' && <SkeletonLista filas={3} etiqueta="Cargando gestiones…" conIcono={false} />}

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
          <span className="material-symbols-outlined text-[32px] text-[#625d66]" aria-hidden="true">
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
                  {horasPendientes(items) > 0 && (
                    <span className="text-sm font-semibold text-[#49454f]">
                      · {MC.hoy.horasPendientes(horasPendientes(items))}
                    </span>
                  )}
                </h2>
                <ul className="flex flex-col gap-3">
                  {items.map((g) => {
                    const hecha = g.estado === 'hecha';
                    return (
                      <li key={g.id} className={`${CARD} !p-4 sm:!p-5 !gap-3`}>
                        <div className="flex min-w-0 flex-col gap-1">
                          <h3 className={`${FONT_HEADLINE} font-bold text-[#181b27] ${hecha ? 'line-through' : ''}`}>
                            {g.titulo}
                          </h3>
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
                        </div>
                        <GestionEstado
                          eventoId={g.evento_id}
                          gestion={g}
                          onActualizada={(actualizada, mensaje) => alActualizar(g, actualizada, mensaje)}
                          confirmacionInline={false}
                        />
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