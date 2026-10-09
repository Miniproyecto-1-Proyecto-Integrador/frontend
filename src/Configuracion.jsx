
import { useEffect, useState } from 'react';
import {
  BOTON_PRINCIPAL,
  CARD,
  ERROR,
  FONT_HEADLINE,
  INPUT,
  LABEL,
} from './components/ui';
import { getLimiteDiario, updateLimiteDiario } from './services/events';

export default function Configuracion() {
  const [limiteDiario, setLimiteDiario] = useState('6');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarLimite() {
      try {
        const data = await getLimiteDiario();

        if (activo) {
          setLimiteDiario(String(data.horas));
        }
      } catch {
        if (activo) {
          setError('No pudimos cargar tu límite diario. Intenta de nuevo.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarLimite();

    return () => {
      activo = false;
    };
  }, []);

  async function guardarLimite(e) {
    e.preventDefault();
    setError('');
    setMensajeExito('');

    const valor = Number(limiteDiario);

    if (!limiteDiario.trim() || !Number.isFinite(valor)) {
      setError('Ingresa un número válido.');
      return;
    }

    if (valor < 1 || valor > 16) {
      setError('El límite diario debe estar entre 1 y 16 horas.');
      return;
    }

    setGuardando(true);

    try {
      const data = await updateLimiteDiario(valor);
      setLimiteDiario(String(data.horas));
      setMensajeExito('El límite diario se guardó correctamente.');
    } catch (err) {
      const mensajeHoras = err.fieldErrors?.horas;
      const mensajeDetalle = err.data?.detail;

      if (Array.isArray(mensajeHoras) && mensajeHoras.length > 0) {
        setError(mensajeHoras[0]);
      } else if (typeof mensajeDetalle === 'string' && mensajeDetalle) {
        setError(mensajeDetalle);
      } else {
        setError(
          err.message || 'No pudimos guardar el límite diario. Intenta de nuevo.'
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className={`${FONT_HEADLINE} text-2xl sm:text-3xl font-bold text-[#181b27]`}>
          Configuración
        </h1>

        <p className="mt-2 text-sm sm:text-base text-[#49454f]">
          Configura el máximo de horas que puedes planificar en un mismo día.
        </p>
      </div>

      <form className={CARD} onSubmit={guardarLimite} noValidate>
        <div>
          <h2 className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>
            Límite diario de trabajo
          </h2>

          <p className="mt-1 text-sm text-[#49454f]">
            Este límite se utilizará para detectar posibles conflictos de planificación.
          </p>
        </div>

        <div>
          <label htmlFor="limite-diario" className={LABEL}>
            Horas máximas por día
          </label>

          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7580] pointer-events-none"
              aria-hidden="true"
            >
              schedule
            </span>

            <input
              id="limite-diario"
              name="limite-diario"
              type="number"
              min="1"
              max="16"
              step="0.01"
              value={limiteDiario}
              onChange={(e) => {
                setLimiteDiario(e.target.value);
                setError('');
                setMensajeExito('');
              }}
              className={`${INPUT} pl-10`}
              aria-describedby={
                `limite-diario-ayuda${error ? ' limite-diario-error' : ''}`
              }
              aria-invalid={Boolean(error)}
              disabled={guardando || cargando}
            />
          </div>

          <p id="limite-diario-ayuda" className="mt-1.5 text-xs text-[#49454f]">
            Ingresa un valor entre 1 y 16 horas.
          </p>

          {error && (
            <p id="limite-diario-error" className={ERROR} role="alert">
              {error}
            </p>
          )}

          {mensajeExito && (
            <p className="mt-1.5 text-sm text-[#3f6212]" role="status">
              {mensajeExito}
            </p>
          )}
        </div>

        <button
          type="submit"
          className={BOTON_PRINCIPAL}
          disabled={guardando || cargando}
        >
          {cargando
            ? 'Cargando límite…'
            : guardando
              ? 'Guardando…'
              : 'Guardar límite'}
        </button>
      </form>
    </section>
  );
}
