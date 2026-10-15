import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgresoBarra from './components/ProgresoBarra';
import { BOTON_PRINCIPAL, CARD, FONT_HEADLINE } from './components/ui';
import { MC } from './helpers/microcopy';
import { listEvents } from './services/events';

// /progreso: una tarjeta por evento con su barra de progreso.
// El backend solo expone el progreso POR evento, así que cada tarjeta consulta
// el suyo (cada una maneja su propio cargando / error / "Reintentar").
export default function Progreso() {
  const [status, setStatus] = useState('loading'); // loading | ok | empty | error
  const [eventos, setEventos] = useState([]);
  const headingRef = useRef(null);

  const cargar = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await listEvents();
      setEventos(data);
      setStatus(data.length === 0 ? 'empty' : 'ok');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Foco en el <h1> al terminar de cargar (mismo patrón que el resto de vistas).
  useEffect(() => {
    if (status === 'ok' || status === 'empty') headingRef.current?.focus();
  }, [status]);

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
        <p className="px-1 py-3 text-[#49454f]" role="status">{MC.paginaProgreso.cargando}</p>
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
          <span className="material-symbols-outlined text-[32px] text-[#7a7580]" aria-hidden="true">event_available</span>
          <p className="text-[#49454f] italic">{MC.paginaProgreso.vacio}</p>
          <Link to="/crear" className={BOTON_PRINCIPAL}>{MC.paginaProgreso.crear}</Link>
        </div>
      )}

      {status === 'ok' && (
        <ul className="flex flex-col gap-3" aria-label={`${eventos.length} eventos`}>
          {eventos.map((ev) => (
            <li key={ev.id} className={`${CARD} !p-4 sm:!p-5 !gap-3`}>
              <Link
                to={`/evento/${ev.id}`}
                className={`${FONT_HEADLINE} font-bold text-[#63518b] underline underline-offset-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2`}
              >
                {ev.nombre}
              </Link>
              <ProgresoBarra eventoId={ev.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}