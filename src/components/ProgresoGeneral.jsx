import { useEffect, useState } from 'react';
import { MC } from '../helpers/microcopy';
import { BOTON_SECUNDARIO, CARD, FONT_HEADLINE } from './ui';

const RADIO = 52;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

// Anillo grande con el porcentaje al centro. Se llena con una animación corta al entrar
// (sin animación si la persona tiene activada la opción de reducir movimiento).
function Anillo({ porcentaje, completo }) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setValor(porcentaje));
    return () => cancelAnimationFrame(id);
  }, [porcentaje]);

  const offset = CIRCUNFERENCIA * (1 - Math.min(100, Math.max(0, valor)) / 100);

  return (
    <div
      role="progressbar"
      aria-label={`${MC.progresoGeneral.titulo}: ${porcentaje}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      className="relative h-40 w-40 shrink-0 sm:h-48 sm:w-48"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RADIO} fill="none" stroke="#e5e7f8" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={RADIO}
          fill="none"
          stroke={completo ? '#1e5a34' : '#63518b'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${FONT_HEADLINE} text-4xl font-extrabold text-[#181b27] sm:text-5xl`}>
          {porcentaje}%
        </span>
        <span className="text-xs text-[#49454f]">{MC.progresoGeneral.completado}</span>
      </div>
    </div>
  );
}

const TONOS = {
  verde: 'border-[#1e5a34]/25 bg-[#eaf7ee] text-[#1e5a34]',
  naranja: 'border-[#8a2c00]/30 bg-[#ffe1d3] text-[#8a2c00]', // mismo tono que el chip "Pendiente"
  morado: 'border-[#4d3d78]/25 bg-[#ede9f7] text-[#4d3d78]',
};

function Dato({ etiqueta, valor, tono }) {
  return (
    <div className={`flex min-w-[6rem] flex-1 flex-col items-center rounded-xl border px-3 py-1.5 text-center ${TONOS[tono]}`}>
      <span className={`${FONT_HEADLINE} text-xl font-bold leading-tight`}>{valor}</span>
      <span className="text-xs font-medium">{etiqueta}</span>
    </div>
  );
}

// Tarjeta centrada para los estados sin anillo (cargando, error, vacío).
function TarjetaSimple({ children }) {
  return (
    <section
      aria-labelledby="progreso-general-titulo"
      className={`${CARD} !items-center !gap-4 text-center !bg-gradient-to-b !from-[#f2f3ff] !to-white`}
    >
      <h2 id="progreso-general-titulo" className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>
        {MC.progresoGeneral.titulo}
      </h2>
      {children}
    </section>
  );
}

function AvisoParcial({ cargados, eventos, onReintentar }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-xs text-[#6b4a00]">{MC.progresoGeneral.parcial(cargados, eventos)}</p>
      <button type="button" className={`${BOTON_SECUNDARIO} py-1 px-3 text-xs`} onClick={onReintentar}>
        {MC.progresoGeneral.reintentar}
      </button>
    </div>
  );
}

/**
 * Resumen llamativo de /progreso: anillo a la izquierda y, a su derecha, la barra general,
 * el mensaje y las métricas. La altura de la sección es casi la del anillo para que los
 * eventos se vean sin hacer scroll. En pantallas angostas se apila.
 * El backend solo da el progreso POR evento, así que el general se calcula sumando las
 * gestiones de todos los eventos (hechas / total), no promediando porcentajes.
 *
 *   resumen: { cargando, fallidos, cargados, eventos, hechas, total, porcentaje }
 */
export default function ProgresoGeneral({ resumen, onReintentar }) {
  const { cargando, fallidos, cargados, eventos, hechas, total, porcentaje } = resumen;

  if (cargando) {
    return (
      <TarjetaSimple>
        <p role="status" className="py-8 text-sm text-[#49454f]">{MC.progresoGeneral.cargando}</p>
      </TarjetaSimple>
    );
  }

  if (cargados === 0) {
    return (
      <TarjetaSimple>
        <div role="alert" className="flex flex-col items-center gap-3 py-2">
          <p className="flex items-center gap-2 text-sm text-[#181b27]">
            <span className="material-symbols-outlined text-[22px] text-[#ba1a1a]" aria-hidden="true">error</span>
            {MC.progresoGeneral.error}
          </p>
          <button type="button" className={`${BOTON_SECUNDARIO} py-1.5 px-4 text-xs`} onClick={onReintentar}>
            {MC.progresoGeneral.reintentar}
          </button>
        </div>
      </TarjetaSimple>
    );
  }

  if (total === 0) {
    return (
      <TarjetaSimple>
        <p className="flex items-center gap-2 py-4 text-sm italic text-[#49454f]">
          <span className="material-symbols-outlined text-[20px] text-[#7a7580]" aria-hidden="true">playlist_add</span>
          {MC.progresoGeneral.vacio}
        </p>
        {fallidos > 0 && <AvisoParcial cargados={cargados} eventos={eventos} onReintentar={onReintentar} />}
      </TarjetaSimple>
    );
  }

  const completo = porcentaje === 100;
  const mensaje = completo
    ? MC.progresoGeneral.mensajeListo
    : hechas === 0
      ? MC.progresoGeneral.mensajeInicio
      : MC.progresoGeneral.mensajeAvance;

  return (
    <section
      aria-labelledby="progreso-general-titulo"
      className={`${CARD} !p-5 sm:!p-6 !gap-5 !flex-col items-center sm:!flex-row sm:items-stretch !bg-gradient-to-b !from-[#f2f3ff] !to-white`}
    >
      <Anillo porcentaje={porcentaje} completo={completo} />

      <div className="flex w-full min-w-0 flex-1 flex-col justify-between gap-4 text-left">
        <div className="flex flex-col gap-2">
          <h2 id="progreso-general-titulo" className={`${FONT_HEADLINE} text-base font-bold text-[#181b27]`}>
            {MC.progresoGeneral.titulo}
          </h2>
          {/* La barra repite el dato del anillo: se oculta a lectores de pantalla para no duplicarlo. */}
          <div aria-hidden="true" className="h-3 w-full overflow-hidden rounded-full bg-[#e5e7f8]">
            <div
              className={`h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none ${
                completo ? 'bg-[#1e5a34]' : 'bg-[#63518b]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
            />
          </div>
        </div>

        <div aria-live="polite" className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-[#181b27]">
            {MC.progresoGeneral.conteo(hechas, total)} {MC.progresoGeneral.eventos(cargados)}
          </p>
          <p className="text-sm text-[#49454f]">{mensaje}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dato etiqueta={MC.progresoGeneral.hechas} valor={hechas} tono="verde" />
          <Dato etiqueta={MC.progresoGeneral.porCompletar} valor={total - hechas} tono="naranja" />
          <Dato etiqueta={MC.progresoGeneral.eventosEtiqueta} valor={eventos} tono="morado" />
        </div>

        {fallidos > 0 && <AvisoParcial cargados={cargados} eventos={eventos} onReintentar={onReintentar} />}
      </div>
    </section>
  );
}