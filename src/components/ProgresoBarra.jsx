import { useCallback, useEffect, useRef, useState } from 'react';
import { MC } from '../helpers/microcopy';
import { getProgresoEvento } from '../services/events';
import { BOTON_SECUNDARIO, SkeletonBloque } from './ui';

/**
 * Vista (sin peticiones) del progreso de UN evento: cargando, error con "Reintentar",
 * "Sin gestiones asignadas todavía" o la barra con porcentaje y conteo.
 * Muestra exactamente lo que devuelve el backend; no recalcula nada.
 *
 *   status: 'loading' | 'ok' | 'error'
 *   datos:  { total_subtareas, subtareas_hechas, porcentaje }
 */
export function EstadoProgreso({ status, datos, onReintentar }) {
  if (status === 'loading') {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{MC.progreso.cargando}</span>
        <div aria-hidden="true" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <SkeletonBloque className="h-4 w-32" />
            <SkeletonBloque className="h-4 w-10" />
          </div>
          <SkeletonBloque className="h-3 w-full !rounded-full" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="flex items-center gap-2 text-sm text-[#181b27]">
          <span className="material-symbols-outlined text-[22px] text-[#ba1a1a]" aria-hidden="true">error</span>
          {MC.progreso.error}
        </p>
        <button
          type="button"
          className={`${BOTON_SECUNDARIO} py-1.5 px-4 text-xs`}
          onClick={onReintentar}
        >
          {MC.progreso.reintentar}
        </button>
      </div>
    );
  }

  // Con 0 gestiones no se dibuja una barra vacía.
  if (!datos || datos.total_subtareas === 0) {
    return (
      <p className="flex items-center gap-2 text-sm italic text-[#49454f]">
        <span className="material-symbols-outlined text-[20px] text-[#625d66]" aria-hidden="true">playlist_add</span>
        {MC.progreso.vacio}
      </p>
    );
  }

  const porcentaje = Number(datos.porcentaje) || 0;
  const ancho = Math.min(100, Math.max(0, porcentaje)); // solo para el CSS

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        {/* aria-live: el lector de pantalla anuncia el avance cuando cambia */}
        <p aria-live="polite" className="text-sm text-[#49454f]">
          {MC.progreso.conteo(datos.subtareas_hechas, datos.total_subtareas)}
        </p>
        <span className="text-sm font-bold text-[#181b27]">{porcentaje}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={MC.progreso.etiquetaBarra(porcentaje)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className="h-3 w-full overflow-hidden rounded-full bg-[#e5e7f8]"
      >
        <div
          className="h-full rounded-full bg-[#63518b] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${ancho}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Barra de progreso de preparación de UN evento (C2) que consulta sola
 * GET /api/events/:id/progreso/.
 *
 * - eventoId: id del evento.
 * - claveActualizacion: cuando este valor cambia, se vuelve a consultar el
 *   progreso en silencio (sin parpadeo) para que la barra se actualice sin recargar.
 */
export default function ProgresoBarra({ eventoId, claveActualizacion = '' }) {
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [datos, setDatos] = useState(null);
  const reqId = useRef(0);
  const tieneDatos = useRef(false);

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      const id = ++reqId.current; // descarta respuestas viejas si llegan desordenadas
      if (!silencioso) setStatus('loading');
      try {
        const res = await getProgresoEvento(eventoId);
        if (id !== reqId.current) return;
        setDatos(res);
        tieneDatos.current = true;
        setStatus('ok');
      } catch {
        if (id !== reqId.current) return;
        setStatus('error');
      }
    },
    [eventoId]
  );

  useEffect(() => {
    cargar({ silencioso: tieneDatos.current });
  }, [cargar, claveActualizacion]);

  return <EstadoProgreso status={status} datos={datos} onReintentar={() => cargar()} />;
}