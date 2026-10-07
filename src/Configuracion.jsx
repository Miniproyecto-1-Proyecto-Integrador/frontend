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
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  useEffect(() => {
    async function cargarLimite() {
      try {
        const data = await getLimiteDiario();
        setLimiteDiario(String(data.horas));
      } catch (error) {
        setError('No pudimos cargar tu límite diario. Intenta de nuevo.');
      }
    }

    cargarLimite();
  }, []);

  async function guardarLimite(e) {
    e.preventDefault();
    setError('');
    setMensajeExito('');

    const valor = Number(limiteDiario);

    if (!limiteDiario || !Number.isFinite(valor)) {
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
    } catch (error) {
      setError(
        error.message || 'No pudimos guardar el límite diario. Intenta de nuevo.'
      );
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

      <form className={CARD} onSubmit={guardarLimite}>
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
            className={INPUT}
            aria-describedby="limite-diario-ayuda limite-diario-error"
            aria-invalid={Boolean(error)}
            disabled={guardando}
          />

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
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar límite'}
        </button>
      </form>
    </section>
  );
}