import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoProgreso } from './components/ProgresoBarra';
import ProgresoGeneral, { ProgresoGeneralSkeleton } from './components/ProgresoGeneral';
import { BOTON_PRINCIPAL, CARD, FONT_HEADLINE, SkeletonLista } from './components/ui';
import { DoodleCalendario } from './components/Doodles';
import { MC } from './helpers/microcopy';
import { useTituloPagina } from './helpers/useTituloPagina';
import { getProgresoEvento, listEvents } from './services/events';

// /progreso: arriba el progreso general (anillo + barra) y debajo una tarjeta por evento.
// El backend solo expone el progreso POR evento, así que cada evento consulta el suyo
// (cada tarjeta maneja su propio cargando / error / "Reintentar") y el general se
// calcula con esos mismos datos.
export default function Progreso() {
  useTituloPagina('Progreso');
  const [status, setStatus] = useState('loading'); // loading | ok | empty | error
  const [eventos, setEventos] = useState([]);
  const [progresos, setProgresos] = useState({}); // { [id]: { status, datos } }
  const headingRef = useRef(null);

  const cargarProgreso = useCallback(async (id) => {
    setProgresos((p) => ({ ...p, [id]: { status: 'loading', datos: null } }));
    try {
      const datos = await getProgresoEvento(id);
      setProgresos((p) => ({ ...p, [id]: { status: 'ok', datos } }));
    } catch {
      setProgresos((p) => ({ ...p, [id]: { status: 'error', datos: null } }));
    }
  }, []);

  const cargar = useCallback(async () => {
    setStatus('loading');
    setProgresos({});
    try {
      const data = await listEvents();
      setEventos(data);
      setStatus(data.length === 0 ? 'empty' : 'ok');
      data.forEach((ev) => cargarProgreso(ev.id));
    } catch {
      setStatus('error');
    }
  }, [cargarProgreso]);

  useEffect(() => { cargar(); }, [cargar]);

  // Foco en el <h1> al terminar de cargar (mismo patrón que el resto de vistas).
  useEffect(() => {
    if (status === 'ok' || status === 'empty') headingRef.current?.focus();
  }, [status]);

  const resumen = useMemo(() => {
    const lista = eventos.map((ev) => progresos[ev.id]);
    const ok = lista.filter((p) => p?.status === 'ok');
    const hechas = ok.reduce((acc, p) => acc + (Number(p.datos.subtareas_hechas) || 0), 0);
    const total = ok.reduce((acc, p) => acc + (Number(p.datos.total_subtareas) || 0), 0);
    return {
      cargando: lista.some((p) => !p || p.status === 'loading'),
      fallidos: lista.filter((p) => p?.status === 'error').length,
      cargados: ok.length,
      eventos: eventos.length,
      hechas,
      total,
      porcentaje: total > 0 ? Math.round((hechas / total) * 100) : 0,
    };
  }, [eventos, progresos]);

  function reintentarFallidos() {
    eventos.filter((ev) => progresos[ev.id]?.status === 'error').forEach((ev) => cargarProgreso(ev.id));
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex flex-col gap-1 py-1">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={`${FONT_HEADLINE} text-2xl sm:text-3xl font-extrabold text-[#181b27] tracking-tight focus:outline-none`}
        >
          {MC.paginaProgreso.titulo}
        </h1>
        <p className="text-sm text-[#49454f]">{MC.paginaProgreso.subtitulo}</p>
      </div>

      {status === 'loading' && (
        <>
          <ProgresoGeneralSkeleton etiqueta={MC.paginaProgreso.cargando} />
          <SkeletonLista filas={2} etiqueta="" conIcono={false} />
        </>
      )}

      {status === 'error' && (
        <div role="alert" className={`${CARD} items-start`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-[#ba1a1a]" aria-hidden="true">error</span>
            <p className="text-[#181b27]">{MC.paginaProgreso.error}</p>
          </div>
          <button type="button" className={BOTON_PRINCIPAL} onClick={cargar}>
            {MC.paginaProgreso.reintentar}
          </button>
        </div>
      )}

      {status === 'empty' && (
        <div className={`${CARD} items-center text-center py-10`}>
          <DoodleCalendario className="h-24 w-32" />
          <p className="text-[#49454f] italic">{MC.paginaProgreso.vacio}</p>
          <Link to="/crear" className={BOTON_PRINCIPAL}>{MC.paginaProgreso.crear}</Link>
        </div>
      )}

      {status === 'ok' && (
        <>
          <ProgresoGeneral resumen={resumen} onReintentar={reintentarFallidos} />

          <section aria-labelledby="progreso-por-evento" className="flex flex-col gap-3">
            <h2 id="progreso-por-evento" className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>
              {MC.progresoGeneral.porEvento}
            </h2>
            <ul className="flex flex-col gap-3" aria-label={`${eventos.length} eventos`}>
              {eventos.map((ev) => {
                const p = progresos[ev.id];
                return (
                  <li key={ev.id} className={`${CARD} !p-4 sm:!p-5 !gap-3`}>
                    <Link
                      to={`/evento/${ev.id}`}
                      className={`${FONT_HEADLINE} font-bold text-[#63518b] underline underline-offset-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2`}
                    >
                      {ev.nombre}
                    </Link>
                    <EstadoProgreso
                      status={p?.status ?? 'loading'}
                      datos={p?.datos}
                      onReintentar={() => cargarProgreso(ev.id)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}