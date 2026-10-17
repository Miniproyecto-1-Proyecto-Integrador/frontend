import { useEffect, useRef, useState } from 'react';
import { esFalloDeRed, MENSAJE_ERROR_RED } from '../helpers/errors';
import { MC } from '../helpers/microcopy';
import { updateSubtask } from '../services/events';
import { BOTON_PRINCIPAL, BOTON_SECUNDARIO, LABEL } from './ui';

const TEXTAREA =
  'w-full rounded-xl border border-[#e5e7f8] bg-white px-3 py-2 text-sm text-[#181b27] ' +
  'placeholder:text-[#625d66] resize-y ' +
  'focus:border-[#63518b] focus:ring-2 focus:ring-[#63518b]/20 outline-none ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2';

// El estado nunca se comunica solo con color: siempre lleva ícono + texto.
const CHIP = {
  pendiente: { icon: 'warning', clase: 'bg-[#ffe1d3] text-[#8a2c00] border-[#8a2c00]/30' },
  hecha: { icon: 'check_circle', clase: 'bg-[#eaf7ee] text-[#1e5a34] border-[#1e5a34]/25' },
  pospuesta: { icon: 'pause_circle', clase: 'bg-[#fff4d6] text-[#6b4a00] border-[#6b4a00]/25' },
};

export function EstadoChip({ estado }) {
  const clave = CHIP[estado] ? estado : 'pendiente';
  const { icon, clase } = CHIP[clave];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${clase}`}>
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
      {MC.estados[clave]}
    </span>
  );
}

/**
 * Chip de estado + nota + acciones "Hecha" / "Posponer" de UNA gestión.
 * Se usa igual en /evento/:id y en /hoy.
 *
 * - eventoId: id del evento dueño de la gestión (para el PATCH existente).
 * - gestion: { id, titulo, estado, nota }.
 * - onActualizada(actualizada, mensaje): se llama cuando el backend confirmó el cambio.
 * - confirmacionInline: si es false, el mensaje de éxito lo muestra quien llama
 *   (en /hoy la gestión puede salir de la lista al cambiar de estado).
 *
 * El chip cambia al instante (optimista). Si el guardado falla, se revierte,
 * se muestra un error amigable y la nota escrita NO se borra.
 */
export function GestionEstado({ eventoId, gestion, onActualizada, confirmacionInline = true }) {
  const titulo = gestion.titulo;
  const notaGuardada = gestion.nota ?? '';

  const [optimista, setOptimista] = useState(null); // { estado, nota } mientras se guarda
  const [guardando, setGuardando] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [texto, setTexto] = useState(notaGuardada);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const posponerBtnRef = useRef(null);
  const textareaRef = useRef(null);
  const avisoRef = useRef(null);

  const estado = optimista ? optimista.estado : (gestion.estado || 'pendiente');
  const nota = optimista ? optimista.nota : notaGuardada;

  // Cuando llegan los datos reales del backend, se descarta el estado optimista.
  useEffect(() => {
    setOptimista(null);
  }, [gestion.estado, gestion.nota]);

  useEffect(() => {
    if (formAbierto) textareaRef.current?.focus();
  }, [formAbierto]);

  // Tras un cambio los botones cambian: llevamos el foco al aviso para no
  // dejar a quien usa teclado o lector de pantalla en el vacío.
  useEffect(() => {
    if (aviso && confirmacionInline) avisoRef.current?.focus();
  }, [aviso, confirmacionInline]);

  async function guardar(nuevoEstado, notaNueva = '') {
    const payload = { estado: nuevoEstado };
    if (nuevoEstado === 'pospuesta') payload.nota = notaNueva;
    else if (nuevoEstado === 'pendiente') payload.nota = '';

    setError('');
    setAviso('');
    setGuardando(true);
    setOptimista({
      estado: nuevoEstado,
      nota:
        nuevoEstado === 'pospuesta' ? notaNueva
            : nuevoEstado === 'pendiente' ? ''
                : notaGuardada,
    });
    setFormAbierto(false);

    try {
      const actualizada = await updateSubtask(eventoId, gestion.id, payload);
      const mensaje =
        nuevoEstado === 'hecha'
          ? MC.exito.hecha(titulo)
          : nuevoEstado === 'pospuesta'
            ? MC.exito.pospuesta(titulo, notaNueva !== '')
            : MC.exito.pendiente(titulo);
      if (confirmacionInline) setAviso(mensaje);
      onActualizada?.(actualizada, mensaje);
    } catch (err) {
      setOptimista(null); // revierte el chip
      const conNota = nuevoEstado === 'pospuesta' && notaNueva !== '';
      setError(
        esFalloDeRed(err)
          ? MENSAJE_ERROR_RED
          : conNota ? MC.error.guardarConNota : MC.error.guardar
      );
      // Reabre el formulario con lo que la persona había escrito (no se pierde).
      if (nuevoEstado === 'pospuesta') setFormAbierto(true);
    } finally {
      setGuardando(false);
    }
  }

  function abrirForm() {
    setError('');
    setAviso('');
    setTexto(notaGuardada);
    setFormAbierto(true);
  }

  function cancelarForm() {
    setFormAbierto(false);
    setError('');
    posponerBtnRef.current?.focus();
  }

  function enviarPosponer(e) {
    e.preventDefault();
    guardar('pospuesta', texto.trim());
  }

  const compacto = 'py-1.5 px-4 text-xs';

  return (
    <div className="flex flex-col gap-3">
      <div>
        <EstadoChip estado={estado} />
      </div>

      {nota && (
        <p className="whitespace-pre-wrap break-words text-xs text-[#49454f]">
          <span className="font-semibold text-[#181b27]">{MC.nota.prefijo}:</span> {nota}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {estado !== 'hecha' && (
          <button
            type="button"
            className={`${BOTON_SECUNDARIO} ${compacto}`}
            disabled={guardando}
            onClick={() => guardar('hecha')}
            aria-label={`Marcar como hecha: ${titulo}`}
          >
            {MC.acciones.hecha}
          </button>
        )}

        {estado === 'pendiente' && (
          <button
            ref={posponerBtnRef}
            type="button"
            className={`${BOTON_SECUNDARIO} ${compacto}`}
            disabled={guardando}
            aria-expanded={formAbierto}
            aria-controls={formAbierto ? `posponer-${gestion.id}` : undefined}
            onClick={() => (formAbierto ? textareaRef.current?.focus() : abrirForm())}
            aria-label={`Posponer: ${titulo}`}
          >
            {MC.acciones.posponer}
          </button>
        )}

        {estado !== 'pendiente' && (
          <button
            type="button"
            className={`${BOTON_SECUNDARIO} ${compacto}`}
            disabled={guardando}
            onClick={() => guardar('pendiente')}
            aria-label={`Volver a pendiente: ${titulo}`}
          >
            {MC.acciones.volverPendiente}
          </button>
        )}
      </div>

      {formAbierto && (
        <form
          id={`posponer-${gestion.id}`}
          onSubmit={enviarPosponer}
          aria-label={`Posponer: ${titulo}`}
          className="flex flex-col gap-2 rounded-xl border border-[#e5e7f8] bg-white p-3"
        >
          <label htmlFor={`nota-${gestion.id}`} className={LABEL}>
            {MC.nota.etiqueta}
          </label>
          <textarea
            id={`nota-${gestion.id}`}
            ref={textareaRef}
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelarForm();
            }}
            placeholder={MC.nota.placeholder}
            aria-describedby={`nota-ayuda-${gestion.id}`}
            className={TEXTAREA}
          />
          <p id={`nota-ayuda-${gestion.id}`} className="text-xs text-[#49454f]">
            {MC.nota.ayuda}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={`${BOTON_PRINCIPAL} ${compacto}`} disabled={guardando}>
              {guardando ? MC.acciones.guardando : MC.acciones.confirmarPosponer}
            </button>
            <button
              type="button"
              className={`${BOTON_SECUNDARIO} ${compacto}`}
              onClick={cancelarForm}
              disabled={guardando}
            >
              {MC.acciones.cancelar}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#ba1a1a]/40 bg-[#ffdad6]/40 px-3 py-2 text-xs text-[#93000a]"
        >
          {error}
        </p>
      )}

      {aviso && (
        <p
          ref={avisoRef}
          tabIndex={-1}
          role="status"
          className="rounded-xl border border-[#1e5a34]/25 bg-[#eaf7ee] px-3 py-2 text-xs text-[#1e5a34] focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b]"
        >
          {aviso}
        </p>
      )}
    </div>
  );
}