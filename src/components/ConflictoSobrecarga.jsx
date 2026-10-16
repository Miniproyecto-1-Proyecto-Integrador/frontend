import { useEffect, useRef, useState } from 'react';
import { esFalloDeRed, MENSAJE_ERROR_RED } from '../helpers/errors';
import { MC } from '../helpers/microcopy';
import { formatFecha } from '../helpers/sobrecarga';
import { getProximaFechaDisponible } from '../services/events';
import { BOTON_PRINCIPAL, BOTON_SECUNDARIO, FONT_HEADLINE } from './ui';

const COMPACTO = 'py-2 px-4 text-xs';

/**
 * Aviso PREVENTIVO mientras se escribe una gestión en /crear.
 * Todavía no hay error: es una advertencia amable con atajos.
 *   aviso = { horasTotal, limite, disponibles, sugerencia }
 */
export function AvisoSobrecarga({ aviso, onReducir, onMover }) {
  const { horasTotal, limite, disponibles, sugerencia } = aviso;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-xl border border-[#6b4a00]/25 bg-[#fff4d6] p-3 text-[#6b4a00]"
    >
      <p className="flex items-start gap-2 text-sm font-semibold">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">warning</span>
        {MC.sobrecarga.preventivo(horasTotal, limite)}
      </p>
      <p className="text-xs">{MC.sobrecarga.preventivoAyuda}</p>
      {(disponibles > 0 || sugerencia) && (
        <div className="flex flex-wrap gap-2">
          {disponibles > 0 && (
            <button type="button" className={`${BOTON_SECUNDARIO} ${COMPACTO}`} onClick={onReducir}>
              {MC.sobrecarga.reducirA(disponibles)}
            </button>
          )}
          {sugerencia && (
            <button type="button" className={`${BOTON_SECUNDARIO} ${COMPACTO}`} onClick={onMover}>
              {MC.sobrecarga.moverA(formatFecha(sugerencia))}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor, peligro = false }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        peligro ? 'border-[#ba1a1a]/20 bg-[#ffdad6]/30' : 'border-[#e5e7f8] bg-white'
      }`}
    >
      <span className={`block text-xs ${peligro ? 'text-[#ba1a1a]' : 'text-[#7a7580]'}`}>{etiqueta}</span>
      <strong className={peligro ? 'text-[#ba1a1a]' : undefined}>{valor}</strong>
    </div>
  );
}

/**
 * Conflicto de sobrecarga al GUARDAR (el backend respondió 409 con `conflicto`).
 * Ofrece las mismas alternativas que en Mis eventos: reducir horas o mover a
 * la próxima fecha disponible (endpoint proxima-fecha), o volver a editar.
 *
 *   conflicto: { fecha, horas_ya_planificadas, horas_gestion, horas_total,
 *                limite_diario, exceso, horas_disponibles }
 *   gestion:   { id, fecha_objetivo, horas_estimadas }
 */
export function ConflictoSobrecarga({ conflicto, eventoId, gestion, onReducir, onMover, onVolver }) {
  const [buscando, setBuscando] = useState(false);
  const [fechaPropuesta, setFechaPropuesta] = useState(null);
  const [errorFecha, setErrorFecha] = useState(null);
  const headingRef = useRef(null);
  const idTitulo = `conflicto-titulo-${gestion.id}`;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const disponibles = Number(conflicto.horas_disponibles);
  const puedeReducir = Number.isFinite(disponibles) && disponibles > 0;

  async function buscarFecha() {
    setBuscando(true);
    setErrorFecha(null);
    setFechaPropuesta(null);
    try {
      const r = await getProximaFechaDisponible(eventoId, gestion.fecha_objetivo, gestion.horas_estimadas);
      if (r.disponible && r.fecha) setFechaPropuesta(r.fecha);
      else setErrorFecha(r.mensaje || MC.sobrecarga.sinFecha);
    } catch (err) {
      setErrorFecha(esFalloDeRed(err) ? MENSAJE_ERROR_RED : MC.sobrecarga.errorFecha);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={idTitulo}
      className="flex flex-col gap-3 rounded-xl border border-[#ba1a1a]/30 bg-[#fff8f7] p-4 shadow-sm"
    >
      <h3
        id={idTitulo}
        ref={headingRef}
        tabIndex={-1}
        className={`${FONT_HEADLINE} text-sm font-bold text-[#181b27] focus:outline-none`}
      >
        {MC.sobrecarga.conflictoTitulo}
      </h3>
      <p className="text-sm text-[#181b27]">{MC.sobrecarga.conflictoTexto}</p>

      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Dato etiqueta="Fecha" valor={conflicto.fecha} />
        <Dato etiqueta="Horas ya planificadas" valor={`${conflicto.horas_ya_planificadas} h`} />
        <Dato etiqueta="Horas de esta gestión" valor={`${conflicto.horas_gestion} h`} />
        <Dato etiqueta="Total planificado" valor={`${conflicto.horas_total} h`} />
        <Dato etiqueta="Límite diario" valor={`${conflicto.limite_diario} h`} />
        <Dato etiqueta="Exceso" valor={`${conflicto.exceso} h`} peligro />
      </div>

      <p className="text-xs text-[#49454f]">
        {puedeReducir ? MC.sobrecarga.conflictoDisponibles(disponibles) : null}
      </p>

      <div className="flex flex-wrap gap-3">
        {puedeReducir && (
          <button
            type="button"
            className={`${BOTON_PRINCIPAL} ${COMPACTO}`}
            onClick={() => onReducir(disponibles)}
          >
            {MC.sobrecarga.reducirYGuardar(disponibles)}
          </button>
        )}
        <button
          type="button"
          className={`${puedeReducir ? BOTON_SECUNDARIO : BOTON_PRINCIPAL} ${COMPACTO}`}
          onClick={buscarFecha}
          disabled={buscando}
        >
          {buscando ? MC.sobrecarga.buscandoFecha : MC.sobrecarga.moverProxima}
        </button>
        <button type="button" className={`${BOTON_SECUNDARIO} ${COMPACTO}`} onClick={onVolver}>
          {MC.sobrecarga.volverEditar}
        </button>
      </div>

      {fechaPropuesta && (
        <div className="flex flex-col gap-2 rounded-lg border border-[#e5e7f8] bg-white p-3" role="status">
          <p className="text-sm text-[#181b27]">
            {MC.sobrecarga.fechaPropuesta} <strong>{fechaPropuesta}</strong>
          </p>
          <p className="text-xs text-[#49454f]">{MC.sobrecarga.revisaFecha}</p>
          <button
            type="button"
            className={`${BOTON_PRINCIPAL} ${COMPACTO} self-start`}
            onClick={() => onMover(fechaPropuesta)}
          >
            {MC.sobrecarga.confirmarFecha}
          </button>
        </div>
      )}

      {errorFecha && (
        <p className="text-sm text-[#ba1a1a]" role="alert">
          {errorFecha}
        </p>
      )}
    </div>
  );
}