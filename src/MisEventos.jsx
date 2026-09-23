import { useState, useEffect, useCallback } from 'react';
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
      <h1 className={`${FONT_HEADLINE} text-2xl sm:text-3xl font-extrabold text-[#181b27] tracking-tight`}>
        Mis eventos
      </h1>

      {status === 'empty' && (
        <div className={CARD}>
          <p className="text-[#49454f] italic">Aún no tienes eventos creados.</p>
          <Link to="/crear" className={`${BOTON_PRINCIPAL} self-start`}>Crear evento</Link>
        </div>
      )}

      {status === 'ok' && (
        <ul className="flex flex-col gap-3" aria-label={`${eventos.length} eventos`}>
          {eventos.map((ev) => (
            <li key={ev.id}>
              <Link
                to={`/evento/${ev.id}`}
                className={`${CARD} block hover:border-[#63518b] transition-colors no-underline`}
              >
                <div className="flex items-center gap-3">
                  <div className={CARD_HEADER_ICON}>
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">celebration</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`${FONT_HEADLINE} font-bold text-[#181b27]`}>{ev.nombre}</span>
                    <span className="text-xs text-[#7a7580]">
                      {ev.tipo} · {formatFechaHora(ev.fecha_hora)} · {ev.lugar}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}