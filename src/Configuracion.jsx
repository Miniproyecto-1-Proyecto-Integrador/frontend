import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BOTON_PRINCIPAL,
  CARD,
  ERROR,
  FONT_HEADLINE,
  INPUT,
  LABEL,
} from './components/ui';
import { MC } from './helpers/microcopy';
import {
  cargaPorDia,
  diasSobrecargados,
  formatFecha,
  gestionesVigentes,
} from './helpers/sobrecarga';
import { getHoy, getLimiteDiario, updateLimiteDiario } from './services/events';

// Cuántos días se listan en el aviso antes de resumir con "y N días más".
const MAX_DIAS_VISIBLES = 5;

export default function Configuracion() {
  const [limiteDiario, setLimiteDiario] = useState('6');
  const [limiteGuardado, setLimiteGuardado] = useState(null);
  const [hoyData, setHoyData] = useState(null); // gestiones pendientes, para avisar de sobrecarga
  const [cargaError, setCargaError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const avisoRef = useRef(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      const [limite, hoy] = await Promise.allSettled([
        getLimiteDiario(),
        getHoy({ estado: 'pendiente' }),
      ]);
      if (!activo) return;

      if (limite.status === 'fulfilled') {
        setLimiteDiario(String(limite.value.horas));
        setLimiteGuardado(Number(limite.value.horas));
      } else {
        setError('No pudimos cargar tu límite diario. Intenta de nuevo.');
      }

      // Si esto falla, igual se puede guardar el límite: solo no hay aviso de sobrecarga.
      if (hoy.status === 'fulfilled') setHoyData(hoy.value);
      else setCargaError(true);

      setCargando(false);
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  const valor = Number(limiteDiario);
  const valorValido =
    limiteDiario.trim() !== '' && Number.isFinite(valor) && valor >= 1 && valor <= 16;

  // Se recalcula mientras la persona escribe; no hace peticiones nuevas.
  const carga = useMemo(() => cargaPorDia(gestionesVigentes(hoyData)), [hoyData]);
  const dias = useMemo(
    () => (valorValido && hoyData ? diasSobrecargados(carga, valor) : []),
    [carga, valor, valorValido, hoyData]
  );

  const hayAviso = dias.length > 0;
  const yaActivo = limiteGuardado !== null && valor === limiteGuardado;
  // Bajar el límite con días que lo superarían NO se permite. Subirlo nunca agrega conflictos.
  const bajando = limiteGuardado !== null && valorValido && valor < limiteGuardado;
  const bloqueado = bajando && hayAviso;
  const visibles = dias.slice(0, MAX_DIAS_VISIBLES);
  const ocultos = dias.length - visibles.length;

  async function guardarLimite(e) {
    e.preventDefault();
    setError('');
    setMensajeExito('');

    if (!limiteDiario.trim() || !Number.isFinite(valor)) {
      setError('Ingresa un número válido.');
      return;
    }

    if (valor < 1 || valor > 16) {
      setError('El límite diario debe estar entre 1 y 16 horas.');
      return;
    }

    setGuardando(true);

    // Antes de BAJAR el límite se vuelve a consultar la carga real (puede haber cambiado
    // desde que se abrió la pantalla). Si hay conflicto, no se guarda.
    if (bajando) {
      setVerificando(true);
      try {
        const fresco = await getHoy({ estado: 'pendiente' });
        setHoyData(fresco);
        setCargaError(false);
        const conflictos = diasSobrecargados(cargaPorDia(gestionesVigentes(fresco)), valor);
        if (conflictos.length > 0) {
          setError(MC.sobrecarga.configErrorBloqueo);
          setGuardando(false);
          setVerificando(false);
          setTimeout(() => avisoRef.current?.focus(), 0);
          return;
        }
      } catch {
        setError(MC.sobrecarga.configNoVerificado);
        setGuardando(false);
        setVerificando(false);
        return;
      }
      setVerificando(false);
    }

    try {
      const data = await updateLimiteDiario(valor);
      setLimiteDiario(String(data.horas));
      setLimiteGuardado(Number(data.horas));
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

        {/* Días en sobrecarga: se calcula mientras se escribe. Si baja el límite y hay conflicto, no se guarda. */}
        <div aria-live="polite">
          {hayAviso && (
            <div
              ref={avisoRef}
              tabIndex={-1}
              className={`flex flex-col gap-2 rounded-xl border p-4 focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] ${
                bloqueado
                  ? 'border-[#ba1a1a]/40 bg-[#ffdad6]/40 text-[#93000a]'
                  : 'border-[#6b4a00]/25 bg-[#fff4d6] text-[#6b4a00]'
              }`}
            >
              <p className="flex items-start gap-2 text-sm font-bold">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  {bloqueado ? 'block' : 'warning'}
                </span>
                {bloqueado
                  ? MC.sobrecarga.configBloqueado(valor, dias.length)
                  : yaActivo
                    ? MC.sobrecarga.configActivo(valor, dias.length)
                    : MC.sobrecarga.configSigue(valor, dias.length)}
              </p>

              <ul className="ml-1 flex list-none flex-col gap-1 text-sm">
                {visibles.map((d) => (
                  <li key={d.fecha}>
                    {MC.sobrecarga.dia(formatFecha(d.fecha), d.horas, d.exceso)}
                    <span className="block text-xs">
                      {d.eventos.map((ev, i) => (
                        <span key={ev.id}>
                          {i > 0 && ', '}
                          <Link
                            to={`/evento/${ev.id}`}
                            className="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2"
                          >
                            {ev.nombre}
                          </Link>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
                {ocultos > 0 && <li className="text-xs">{MC.sobrecarga.masDias(ocultos)}</li>}
              </ul>

              <p className="text-xs">
                {bloqueado
                  ? MC.sobrecarga.configPieBloqueado
                  : yaActivo
                    ? MC.sobrecarga.configPieActivo
                    : MC.sobrecarga.configPieSigue}
              </p>
            </div>
          )}
        </div>

        {cargaError && (
          <p className="text-xs text-[#49454f]" role="status">
            {MC.sobrecarga.sinRevision}
          </p>
        )}

        <button
          type="submit"
          className={BOTON_PRINCIPAL}
          disabled={guardando || cargando}
        >
          {cargando
            ? 'Cargando límite…'
            : verificando
              ? MC.sobrecarga.revisando
              : guardando
                ? 'Guardando…'
                : 'Guardar límite'}
        </button>
      </form>
    </section>
  );
}