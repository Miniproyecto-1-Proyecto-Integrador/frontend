import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getEvent, updateEvent, deleteEvent, listSubtasks, createSubtask, updateSubtask, deleteSubtask,
} from './services/events';
import {
  FONT_HEADLINE, CARD, CARD_HEADER_ICON, INPUT_WRAP, INPUT_ICON, INPUT, LABEL, ERROR,
  BOTON_PRINCIPAL, BOTON_SECUNDARIO, BOTON_PELIGRO, PILL_BASE, PILL_ACTIVE, PILL_INACTIVE,
} from './components/ui';
import { useFocusTrap } from './helpers/UseFocusTrap';
import { esFalloDeRed, MENSAJE_ERROR_RED } from './helpers/errors';
import SuccessModal from './components/SuccessCard';

const TIPOS_SUGERIDOS = ['Boda', 'Social', 'Corporativo', 'Cumpleaños', 'Otro'];
const EXITO = 'text-[#1e5a34] text-xs font-semibold';

function focusField(id) {
  document.getElementById(id)?.focus();
}

// Prioridad: 1) fallo de red genuino (nunca llegó al backend) → mensaje
// genérico, nunca el texto crudo del navegador. 2) errores de campo del
// backend. 3) err.message de una respuesta real. 4) fallback del llamador.
function mensajeError(err, fallback) {
  if (esFalloDeRed(err)) return MENSAJE_ERROR_RED;
  const fe = err.fieldErrors || {};
  return fe.titulo?.[0] || fe.horas_estimadas?.[0] || fe.fecha_objetivo?.[0]
    || fe.nombre?.[0] || fe.tipo?.[0] || fe.fecha_hora?.[0] || fe.cliente_contacto?.[0] || fe.lugar?.[0]
    || err.message || fallback;
}

function splitFechaHora(iso) {
  if (!iso) return { fecha: '', hora: '' };
  const [fecha, resto] = iso.split('T');
  const hora = (resto || '').slice(0, 5);
  return { fecha, hora };
}

// Maneja Escape para cerrar un panel de confirmación (borrar) y devolver
// el foco al elemento que lo abrió.
function useEscapeToClose(activo, onCerrar) {
  useEffect(() => {
    if (!activo) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activo, onCerrar]);
}

export default function DetalleEvento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pageStatus, setPageStatus] = useState('loading'); // loading | ok | notfound | error
  const [evento, setEvento] = useState(null);
  const [subtareas, setSubtareas] = useState([]);

  // Modal de éxito/error compartido por toda la vista: fondo difuminado,
  // focus trap y un único botón (Aceptar o Reintentar, según variant) en
  // un solo lugar. focoRef: a qué elemento vuelve el foco si no hay una
  // acción posterior. onCerrar: acción a ejecutar al cerrar (ej. quitar la
  // gestión de la lista, salir del evento eliminado, o reintentar la carga).
  const [feedback, setFeedback] = useState({
    open: false, variant: 'exito', titulo: '', mensaje: '', focoRef: null, onCerrar: null,
  });

  // Foco en el <h1> al terminar de cargar: en una SPA no hay recarga de
  // página, así que sin esto un usuario de lector de pantalla no se entera
  // de que "navegó" a esta vista.
  const headingRef = useRef(null);
  // Fallback de foco al cerrar el modal cuando la acción no deja un
  // elemento propio al que volver (ej. se eliminó la gestión completa).
  const planHeadingRef = useRef(null);

  function mostrarFeedback({ variant = 'exito', titulo, mensaje, focoRef, onCerrar }) {
    setFeedback({ open: true, variant, titulo, mensaje, focoRef, onCerrar });
  }

  function cerrarFeedback() {
    const { focoRef, onCerrar } = feedback;
    setFeedback({ open: false, variant: 'exito', titulo: '', mensaje: '', focoRef: null, onCerrar: null });
    if (onCerrar) onCerrar();
    else (focoRef ?? planHeadingRef).current?.focus();
  }

  const cargar = useCallback(async () => {
    setPageStatus('loading');
    try {
      const [eventoData, subtareasData] = await Promise.all([getEvent(id), listSubtasks(id)]);
      setEvento(eventoData);
      setSubtareas(subtareasData);
      setPageStatus('ok');
    } catch (err) {
      setPageStatus(err.status === 404 ? 'notfound' : 'error');
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (pageStatus === 'ok') headingRef.current?.focus();
  }, [pageStatus]);

  if (pageStatus === 'loading') {
    return <p className="px-4 py-3" role="status">Cargando evento…</p>;
  }

  if (pageStatus === 'notfound') {
    return (
      <div className={CARD}>
        <p role="alert">El evento no existe.</p>
        <Link to="/crear" className={`${BOTON_SECUNDARIO} self-start`}>Crear un evento nuevo</Link>
      </div>
    );
  }

  if (pageStatus === 'error') {
    return (
      <SuccessModal
        open
        variant="error"
        titulo="No pudimos cargar el evento"
        mensaje={MENSAJE_ERROR_RED}
        onCerrar={cargar}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-16">
      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7a7580] mb-2 flex-wrap">
        <Link to="/evento" className="hover:underline">Mis Eventos</Link>
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
        <span className="text-[#63518b] font-bold" aria-current="page">{evento.nombre}</span>
      </nav>

      {/* Cabecera con un leve acento decorativo detrás del título — el único
          "momento" visual de la página; el resto se mantiene tranquilo. */}
      <div className="relative mb-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
          <div className="absolute -top-14 -left-10 w-56 h-56 rounded-full bg-gradient-to-br from-[#d2e4ff] via-[#e4d9ff] to-transparent opacity-50 blur-2xl" />
        </div>
        {/* tabIndex=-1: no entra en el orden de tab, solo recibe foco por programa */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={`${FONT_HEADLINE} relative text-2xl sm:text-3xl font-extrabold text-[#181b27] tracking-tight focus:outline-none`}
        >
          {evento.nombre}
        </h1>
      </div>

      <div className="flex flex-col gap-8">
        <EventoCard
          evento={evento}
          onGuardado={(actualizado) => setEvento(actualizado)}
          onEliminado={() => navigate('/evento')}
          onFeedback={mostrarFeedback}
        />

        <div className={CARD}>
          <div className="flex items-center gap-3 pb-4 border-b border-[#ebedfe]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d2e4ff] to-[#e8f0ff] flex items-center justify-center text-[#3c608b] shadow-sm">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">checklist_rtl</span>
            </div>
            <div>
              <h2
                ref={planHeadingRef}
                tabIndex={-1}
                className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27] focus:outline-none`}
              >
                Plan logístico
              </h2>
              {subtareas.length > 0 && (
                <p className="text-xs text-[#7a7580]">
                  {subtareas.length} {subtareas.length === 1 ? 'gestión' : 'gestiones'} en el plan
                </p>
              )}
            </div>
          </div>

          {subtareas.length === 0 && (
            <div className="flex flex-col items-center text-center gap-2 py-6">
              <span className="material-symbols-outlined text-[28px] text-[#7a7580]" aria-hidden="true">playlist_add</span>
              <p className="text-[#49454f] italic">Este evento no tiene gestiones logísticas todavía.</p>
            </div>
          )}

          <div className="flex flex-col gap-3" aria-label={`${subtareas.length} gestiones logísticas`}>
            {subtareas.map((s) => (
              <SubtareaCard
                key={s.id}
                eventoId={id}
                subtarea={s}
                onGuardada={(actualizada) =>
                  setSubtareas((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)))
                }
                onEliminada={(idEliminado) => {
                  setSubtareas((prev) => prev.filter((x) => x.id !== idEliminado));
                  planHeadingRef.current?.focus();
                }}
                onFeedback={mostrarFeedback}
              />
            ))}
          </div>

          <NuevaGestionForm
            eventoId={id}
            onCreada={(nueva) => setSubtareas((prev) => [...prev, nueva])}
          />
        </div>
      </div>

      <SuccessModal
        open={feedback.open}
        variant={feedback.variant}
        titulo={feedback.titulo}
        mensaje={feedback.mensaje}
        onCerrar={cerrarFeedback}
      />
    </div>
  );
}

// -------------------- Tarjeta de evento (ver / editar / eliminar) --------------------
// Toda la validación de campos la hace el backend; el componente solo
// refleja los fieldErrors que llegan en la respuesta.

const CAMPOS_EVENTO = ['nombre', 'tipo', 'fecha_hora', 'cliente_contacto', 'lugar'];
const ID_POR_CAMPO_EVENTO = {
  nombre: 'ev-nombre', tipo: 'ev-tipo', fecha_hora: 'ev-fecha', cliente_contacto: 'ev-contacto', lugar: 'ev-lugar',
};

function EventoCard({ evento, onGuardado, onEliminado, onFeedback }) {
  const [modo, setModo] = useState('ver');
  const [confirmando, setConfirmando] = useState(false);
  const [estado, setEstado] = useState('idle');
  const [fieldErrors, setFieldErrors] = useState({});

  const { fecha: fechaInicial, hora: horaInicial } = splitFechaHora(evento.fecha_hora);
  const tipoEsSugerido = TIPOS_SUGERIDOS.includes(evento.tipo);

  const [nombre, setNombre] = useState(evento.nombre);
  const [tipo, setTipo] = useState(tipoEsSugerido ? evento.tipo : 'Otro');
  const [tipoPersonalizado, setTipoPersonalizado] = useState(tipoEsSugerido ? '' : evento.tipo);
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState(horaInicial);
  const [clienteContacto, setClienteContacto] = useState(evento.cliente_contacto);
  const [lugar, setLugar] = useState(evento.lugar);

  // Gestión de foco: al entrar a modo edición, foco al primer campo.
  // Al cancelar / guardar / cancelar borrado, foco de vuelta al botón que abrió la acción.
  const editarBtnRef = useRef(null);
  const eliminarBtnRef = useRef(null);
  const confirmarHeadingRef = useRef(null);
  const confirmarDialogRef = useRef(null);

  useEffect(() => {
    if (modo === 'editar') focusField('ev-nombre');
  }, [modo]);

  useEffect(() => {
    if (confirmando) confirmarHeadingRef.current?.focus();
  }, [confirmando]);

  useEscapeToClose(confirmando, () => {
    setConfirmando(false);
    eliminarBtnRef.current?.focus();
  });

  // aria-modal="true" es una promesa de que el foco no puede salir del
  // diálogo mientras está abierto; esto es lo que hace que esa promesa
  // se cumpla de verdad con Tab / Shift+Tab.
  useFocusTrap(confirmando, confirmarDialogRef);

  function limpiarErrorCampo(campo) {
    setFieldErrors((prev) => {
      if (!prev[campo]) return prev;
      const copia = { ...prev };
      delete copia[campo];
      return copia;
    });
  }

  function cancelar() {
    setNombre(evento.nombre);
    setTipo(tipoEsSugerido ? evento.tipo : 'Otro');
    setTipoPersonalizado(tipoEsSugerido ? '' : evento.tipo);
    setFecha(fechaInicial);
    setHora(horaInicial);
    setClienteContacto(evento.cliente_contacto);
    setLugar(evento.lugar);
    setFieldErrors({});
    setModo('ver');
    editarBtnRef.current?.focus();
  }

  function enfocarPrimerError(errors) {
    const primerCampo = CAMPOS_EVENTO.find((c) => errors[c]);
    if (primerCampo) focusField(ID_POR_CAMPO_EVENTO[primerCampo]);
  }

  async function guardar(e) {
    e.preventDefault();

    setEstado('guardando');
    setFieldErrors({});
    try {
      const actualizado = await updateEvent(evento.id, {
        nombre: nombre.trim(),
        tipo: tipo === 'Otro' ? tipoPersonalizado.trim() : tipo,
        fecha_hora: `${fecha}T${hora}:00`,
        cliente_contacto: clienteContacto.trim(),
        lugar: lugar.trim(),
      });
      onGuardado(actualizado);
      setEstado('idle');
      setModo('ver');
      onFeedback({
        titulo: 'Evento editado',
        mensaje: 'Los cambios se guardaron correctamente.',
        focoRef: editarBtnRef,
      });
    } catch (err) {
      setEstado('error');
      const errores = err.fieldErrors || {};
      const hayErroresDeCampo = Object.keys(errores).length > 0;
      setFieldErrors(errores);
      if (hayErroresDeCampo) {
        enfocarPrimerError(errores);
      } else {
        // Error sin campos asociados (red caída, 500, etc.): no hay dónde
        // pintarlo junto a un input, así que usamos el modal genérico.
        onFeedback({
          variant: 'error',
          titulo: 'No pudimos guardar los cambios',
          mensaje: mensajeError(err, 'Inténtalo de nuevo.'),
          focoRef: editarBtnRef,
        });
      }
    }
  }

  async function confirmarEliminar() {
    setEstado('eliminando');
    try {
      await deleteEvent(evento.id);
      setConfirmando(false);
      onFeedback({
        titulo: 'Evento eliminado',
        mensaje: 'El evento y su plan logístico se eliminaron correctamente.',
        onCerrar: onEliminado,
      });
    } catch (err) {
      setEstado('error');
      setConfirmando(false);
      onFeedback({
        variant: 'error',
        titulo: 'No pudimos eliminar el evento',
        mensaje: mensajeError(err, 'Inténtalo de nuevo.'),
        focoRef: eliminarBtnRef,
      });
    }
  }

  if (modo === 'ver') {
    return (
      <div className={CARD}>
        <div className="flex items-center gap-3 pb-4 border-b border-[#ebedfe]">
          <div className={`${CARD_HEADER_ICON} shadow-sm`}>
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">celebration</span>
          </div>
          <h2 className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>Datos del evento</h2>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#7a7580] mt-0.5" aria-hidden="true">sell</span>
            <p><dt className="inline text-[#7a7580]">Tipo:</dt> <dd className="inline font-semibold">{evento.tipo}</dd></p>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#7a7580] mt-0.5" aria-hidden="true">calendar_month</span>
            <p><dt className="inline text-[#7a7580]">Fecha:</dt> <dd className="inline font-semibold">{fechaInicial} {horaInicial}</dd></p>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#7a7580] mt-0.5" aria-hidden="true">person</span>
            <p><dt className="inline text-[#7a7580]">Contacto:</dt> <dd className="inline font-semibold">{evento.cliente_contacto}</dd></p>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#7a7580] mt-0.5" aria-hidden="true">pin_drop</span>
            <p><dt className="inline text-[#7a7580]">Lugar:</dt> <dd className="inline font-semibold">{evento.lugar}</dd></p>
          </div>
        </dl>

        <div className="flex gap-3">
          <button
            ref={editarBtnRef}
            type="button"
            className={BOTON_SECUNDARIO}
            onClick={() => setModo('editar')}
            aria-label={`Editar evento: ${evento.nombre}`}
          >
            Editar
          </button>
          {!confirmando && (
            <button
              ref={eliminarBtnRef}
              type="button"
              className={BOTON_PELIGRO}
              onClick={() => setConfirmando(true)}
              aria-label={`Eliminar evento: ${evento.nombre}`}
            >
              Eliminar evento
            </button>
          )}
        </div>

        {confirmando && (
          <div
            ref={confirmarDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmar-eliminar-evento-heading"
            className="p-4 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6]/20"
          >
            <p
              id="confirmar-eliminar-evento-heading"
              ref={confirmarHeadingRef}
              tabIndex={-1}
              className="mb-3 text-sm focus:outline-none"
            >
              ¿Eliminar este evento y todo su plan logístico? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className={BOTON_SECUNDARIO}
                onClick={() => { setConfirmando(false); eliminarBtnRef.current?.focus(); }}
                disabled={estado === 'eliminando'}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={BOTON_PELIGRO}
                onClick={confirmarEliminar}
                disabled={estado === 'eliminando'}
                aria-live="polite"
              >
                {estado === 'eliminando' ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className={CARD} noValidate aria-label="Editar evento">
      <div className="flex items-center gap-3 pb-4 border-b border-[#ebedfe]">
        <div className={`${CARD_HEADER_ICON} shadow-sm`}>
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">edit</span>
        </div>
        <h2 className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>Editar evento</h2>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-nombre" className={LABEL}>Nombre del evento</label>
        <div className={INPUT_WRAP}>
          <span className={INPUT_ICON} aria-hidden="true">edit_calendar</span>
          <input
            id="ev-nombre" type="text" className={INPUT} value={nombre}
            onChange={(e) => { setNombre(e.target.value); limpiarErrorCampo('nombre'); }}
            aria-invalid={Boolean(fieldErrors.nombre)}
            aria-describedby={fieldErrors.nombre ? 'ev-error-nombre' : undefined}
          />
        </div>
        {fieldErrors.nombre && <p id="ev-error-nombre" className={ERROR} role="alert">{fieldErrors.nombre[0]}</p>}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={LABEL}>Tipo de evento</legend>
        <div
          id="ev-tipo"
          tabIndex={-1}
          className="flex flex-wrap gap-2 rounded-md focus:outline focus:outline-[3px] focus:outline-[#63518b] focus:outline-offset-2"
          aria-describedby={fieldErrors.tipo ? 'ev-error-tipo' : undefined}
        >
          {TIPOS_SUGERIDOS.map((op) => (
            <button
              key={op} type="button" aria-pressed={tipo === op}
              className={`${PILL_BASE} ${tipo === op ? PILL_ACTIVE : PILL_INACTIVE} transition-colors`}
              onClick={() => { setTipo(op); limpiarErrorCampo('tipo'); }}
            >
              {op}
            </button>
          ))}
        </div>
        {tipo === 'Otro' && (
          <input
            type="text" className={`${INPUT} pl-4`} placeholder="Escribe el tipo de evento"
            aria-label="Tipo de evento personalizado"
            value={tipoPersonalizado}
            onChange={(e) => { setTipoPersonalizado(e.target.value); limpiarErrorCampo('tipo'); }}
          />
        )}
        {fieldErrors.tipo && <p id="ev-error-tipo" className={ERROR} role="alert">{fieldErrors.tipo[0]}</p>}
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ev-fecha" className={LABEL}>Fecha</label>
          <div className={INPUT_WRAP}>
            <span className={INPUT_ICON} aria-hidden="true">calendar_month</span>
            <input
              id="ev-fecha" type="date" className={INPUT} value={fecha}
              onChange={(e) => { setFecha(e.target.value); limpiarErrorCampo('fecha_hora'); }}
              aria-invalid={Boolean(fieldErrors.fecha_hora)}
              aria-describedby={fieldErrors.fecha_hora ? 'ev-error-fecha-hora' : undefined}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ev-hora" className={LABEL}>Hora</label>
          <div className={INPUT_WRAP}>
            <span className={INPUT_ICON} aria-hidden="true">schedule</span>
            <input
              id="ev-hora" type="time" className={INPUT} value={hora}
              onChange={(e) => { setHora(e.target.value); limpiarErrorCampo('fecha_hora'); }}
              aria-invalid={Boolean(fieldErrors.fecha_hora)}
              aria-describedby={fieldErrors.fecha_hora ? 'ev-error-fecha-hora' : undefined}
            />
          </div>
        </div>
        {fieldErrors.fecha_hora && (
          <p id="ev-error-fecha-hora" className={`${ERROR} sm:col-span-2`} role="alert">{fieldErrors.fecha_hora[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-contacto" className={LABEL}>Contacto del cliente</label>
        <div className={INPUT_WRAP}>
          <span className={INPUT_ICON} aria-hidden="true">person</span>
          <input
            id="ev-contacto" type="text" className={INPUT} value={clienteContacto}
            onChange={(e) => { setClienteContacto(e.target.value); limpiarErrorCampo('cliente_contacto'); }}
            aria-invalid={Boolean(fieldErrors.cliente_contacto)}
            aria-describedby={fieldErrors.cliente_contacto ? 'ev-error-contacto' : undefined}
          />
        </div>
        {fieldErrors.cliente_contacto && <p id="ev-error-contacto" className={ERROR} role="alert">{fieldErrors.cliente_contacto[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-lugar" className={LABEL}>Lugar</label>
        <div className={INPUT_WRAP}>
          <span className={INPUT_ICON} aria-hidden="true">pin_drop</span>
          <input
            id="ev-lugar" type="text" className={INPUT} value={lugar}
            onChange={(e) => { setLugar(e.target.value); limpiarErrorCampo('lugar'); }}
            aria-invalid={Boolean(fieldErrors.lugar)}
            aria-describedby={fieldErrors.lugar ? 'ev-error-lugar' : undefined}
          />
        </div>
        {fieldErrors.lugar && <p id="ev-error-lugar" className={ERROR} role="alert">{fieldErrors.lugar[0]}</p>}
      </div>

      <div className="flex gap-3">
        <button type="submit" className={BOTON_PRINCIPAL} disabled={estado === 'guardando'} aria-live="polite">
          {estado === 'guardando' ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" className={BOTON_SECUNDARIO} onClick={cancelar} disabled={estado === 'guardando'}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// -------------------- Tarjeta de subtarea (ver / editar / eliminar) --------------------
// Igual que arriba: sin validación local, solo se reflejan los errores del backend.

function SubtareaCard({ eventoId, subtarea, onGuardada, onEliminada, onFeedback }) {
  const [modo, setModo] = useState('ver');
  const [confirmando, setConfirmando] = useState(false);
  const [estado, setEstado] = useState('idle');
  const [errorField, setErrorField] = useState(null);

  const [titulo, setTitulo] = useState(subtarea.titulo);
  const [fechaObjetivo, setFechaObjetivo] = useState(subtarea.fecha_objetivo);
  const [horasEstimadas, setHorasEstimadas] = useState(subtarea.horas_estimadas);

  const editarBtnRef = useRef(null);
  const eliminarBtnRef = useRef(null);
  const confirmarHeadingRef = useRef(null);
  const confirmarDialogRef = useRef(null);

  useEffect(() => {
    if (modo === 'editar') focusField(`sub-titulo-${subtarea.id}`);
  }, [modo, subtarea.id]);

  useEffect(() => {
    if (confirmando) confirmarHeadingRef.current?.focus();
  }, [confirmando]);

  useEscapeToClose(confirmando, () => {
    setConfirmando(false);
    eliminarBtnRef.current?.focus();
  });

  useFocusTrap(confirmando, confirmarDialogRef);

  function cancelar() {
    setTitulo(subtarea.titulo);
    setFechaObjetivo(subtarea.fecha_objetivo);
    setHorasEstimadas(subtarea.horas_estimadas);
    setErrorField(null);
    setModo('ver');
    editarBtnRef.current?.focus();
  }

  async function guardar(e) {
    e.preventDefault();

    setEstado('guardando');
    setErrorField(null);
    try {
      const actualizada = await updateSubtask(eventoId, subtarea.id, {
        titulo: titulo.trim(),
        fecha_objetivo: fechaObjetivo,
        horas_estimadas: horasEstimadas,
      });
      onGuardada(actualizada);
      setEstado('idle');
      setModo('ver');
      onFeedback({
        titulo: 'Gestión editada',
        mensaje: 'Los cambios se guardaron correctamente.',
        focoRef: editarBtnRef,
      });
    } catch (err) {
      setEstado('error');
      const fe = err.fieldErrors || {};
      let campo = null;
      if (fe.titulo) campo = 'titulo';
      else if (fe.fecha_objetivo) campo = 'fecha';
      else if (fe.horas_estimadas) campo = 'horas';
      setErrorField(campo);
      if (campo) {
        focusField(`sub-${campo}-${subtarea.id}`);
      } else {
        onFeedback({
          variant: 'error',
          titulo: 'No pudimos guardar la gestión',
          mensaje: mensajeError(err, 'Inténtalo de nuevo.'),
          focoRef: editarBtnRef,
        });
      }
    }
  }

  async function confirmarEliminar() {
    setEstado('eliminando');
    try {
      await deleteSubtask(eventoId, subtarea.id);
      setConfirmando(false);
      onFeedback({
        titulo: 'Gestión eliminada',
        mensaje: `"${subtarea.titulo}" se eliminó del plan correctamente.`,
        onCerrar: () => onEliminada(subtarea.id),
      });
    } catch (err) {
      setEstado('error');
      setConfirmando(false);
      onFeedback({
        variant: 'error',
        titulo: 'No pudimos eliminar la gestión',
        mensaje: mensajeError(err, 'Inténtalo de nuevo.'),
        focoRef: eliminarBtnRef,
      });
    }
  }

  if (modo === 'ver') {
    return (
      <div className="p-4 rounded-xl border border-[#ebedfe] bg-[#faf8ff] flex flex-col gap-3 transition-shadow hover:shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#181b27]">
          <span className="material-symbols-outlined text-[18px] text-[#63518b]" aria-hidden="true">task_alt</span>
          {subtarea.titulo}
        </div>
        <p className="text-xs text-[#7a7580] flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">event</span>
            {subtarea.fecha_objetivo}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>
            {subtarea.horas_estimadas} h estimadas
          </span>
        </p>

        <div className="flex gap-3">
          <button
            ref={editarBtnRef}
            type="button"
            className={`${BOTON_SECUNDARIO} py-1.5 px-4 text-xs`}
            onClick={() => setModo('editar')}
            aria-label={`Editar gestión: ${subtarea.titulo}`}
          >
            Editar
          </button>
          {!confirmando && (
            <button
              ref={eliminarBtnRef}
              type="button"
              className={`${BOTON_PELIGRO} py-1.5 px-4 text-xs`}
              onClick={() => setConfirmando(true)}
              aria-label={`Eliminar gestión: ${subtarea.titulo}`}
            >
              Eliminar
            </button>
          )}
        </div>

        {confirmando && (
          <div
            ref={confirmarDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`confirmar-eliminar-sub-${subtarea.id}`}
            className="p-3 rounded-lg border border-[#ba1a1a]/30 bg-[#ffdad6]/20"
          >
            <p
              id={`confirmar-eliminar-sub-${subtarea.id}`}
              ref={confirmarHeadingRef}
              tabIndex={-1}
              className="mb-2 text-sm focus:outline-none"
            >
              ¿Eliminar la gestión "{subtarea.titulo}"?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className={`${BOTON_SECUNDARIO} py-1.5 px-4 text-xs`}
                onClick={() => { setConfirmando(false); eliminarBtnRef.current?.focus(); }}
                disabled={estado === 'eliminando'}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${BOTON_PELIGRO} py-1.5 px-4 text-xs`}
                onClick={confirmarEliminar}
                disabled={estado === 'eliminando'}
                aria-live="polite"
              >
                {estado === 'eliminando' ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const idError = `sub-error-${subtarea.id}`;

  return (
    <form
      onSubmit={guardar}
      className="p-4 rounded-xl border border-[#ebedfe] bg-[#faf8ff] flex flex-col gap-3"
      noValidate
      aria-label={`Editar gestión: ${subtarea.titulo}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[#181b27]">
        <span className="material-symbols-outlined text-[18px] text-[#63518b]" aria-hidden="true">edit</span>
        Editar gestión
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`sub-titulo-${subtarea.id}`} className={LABEL}>Título</label>
        <input
          id={`sub-titulo-${subtarea.id}`} type="text" className={`${INPUT} pl-4`} value={titulo}
          onChange={(e) => { setTitulo(e.target.value); setErrorField(null); }}
          aria-invalid={errorField === 'titulo'}
          aria-describedby={errorField === 'titulo' ? idError : undefined}
        />
        {errorField === 'titulo' && <p id={idError} className={ERROR} role="alert">Este campo es obligatorio.</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`sub-fecha-${subtarea.id}`} className={LABEL}>Fecha objetivo</label>
          <input
            id={`sub-fecha-${subtarea.id}`} type="date" className={`${INPUT} pl-4`} value={fechaObjetivo}
            onChange={(e) => { setFechaObjetivo(e.target.value); setErrorField(null); }}
            aria-invalid={errorField === 'fecha'}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`sub-horas-${subtarea.id}`} className={LABEL}>Horas estimadas</label>
          <input
            id={`sub-horas-${subtarea.id}`} type="number" min="0.5" step="0.5" className={`${INPUT} pl-4`}
            value={horasEstimadas}
            onChange={(e) => { setHorasEstimadas(e.target.value); setErrorField(null); }}
            aria-invalid={errorField === 'horas'}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`} disabled={estado === 'guardando'} aria-live="polite">
          {estado === 'guardando' ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className={`${BOTON_SECUNDARIO} py-2 px-4 text-xs`} onClick={cancelar} disabled={estado === 'guardando'}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// -------------------- Agregar nueva gestión al plan --------------------
// US-02: el evento ya existe (venimos del detalle), así que cada alta es
// un POST inmediato a /events/:eventoId/subtasks/. Sin validación local:
// solo se reflejan los fieldErrors que devuelve el backend. El form se
// mantiene abierto tras un alta exitosa para poder encadenar varias
// gestiones seguidas (reservar salón, enviar invitaciones, confirmar
// catering) sin tener que reabrirlo cada vez.

const FORM_ID = 'nueva-gestion-form';

function nuevaGestionVacia() {
  return { titulo: '', fecha_objetivo: '', horas_estimadas: '' };
}

function NuevaGestionForm({ eventoId, onCreada }) {
  const [abierto, setAbierto] = useState(false);
  const [campos, setCampos] = useState(nuevaGestionVacia());
  const [estado, setEstado] = useState('idle'); // idle | guardando | error
  const [error, setError] = useState(null);
  const [errorField, setErrorField] = useState(null);
  const [ultimaAgregada, setUltimaAgregada] = useState(null);

  const toggleBtnRef = useRef(null);

  useEffect(() => {
    if (abierto) focusField('nueva-titulo');
  }, [abierto]);

  useEscapeToClose(abierto, () => {
    setAbierto(false);
    setCampos(nuevaGestionVacia());
    setError(null);
    setErrorField(null);
    setUltimaAgregada(null);
    toggleBtnRef.current?.focus();
  });

  function actualizarCampo(campo, valor) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
    setUltimaAgregada(null);
    if (errorField === campo) {
      setError(null);
      setErrorField(null);
    }
  }

  function cerrar() {
    setAbierto(false);
    setCampos(nuevaGestionVacia());
    setError(null);
    setErrorField(null);
    setUltimaAgregada(null);
    toggleBtnRef.current?.focus();
  }

  async function guardar(e) {
    e.preventDefault();

    setEstado('guardando');
    setError(null);
    setErrorField(null);
    setUltimaAgregada(null);
    try {
      const creada = await createSubtask(eventoId, {
        titulo: campos.titulo.trim(),
        fecha_objetivo: campos.fecha_objetivo,
        horas_estimadas: campos.horas_estimadas,
      });
      onCreada(creada);
      setUltimaAgregada(creada.titulo);
      setCampos(nuevaGestionVacia());
      setEstado('idle');
      // Foco de vuelta al campo Título para poder cargar la siguiente
      // gestión sin volver a hacer tab por todo el formulario.
      focusField('nueva-titulo');
    } catch (err) {
      setEstado('error');
      const fe = err.fieldErrors || {};
      let campo = null;
      if (fe.titulo) campo = 'titulo';
      else if (fe.fecha_objetivo) campo = 'fecha';
      else if (fe.horas_estimadas) campo = 'horas';
      setErrorField(campo);
      setError(mensajeError(err, 'No pudimos agregar la gestión.'));
      if (campo) focusField(`nueva-${campo}`);
    }
  }

  if (!abierto) {
    return (
      <button
        ref={toggleBtnRef}
        type="button"
        className={`${BOTON_SECUNDARIO} self-start flex items-center gap-2`}
        onClick={() => setAbierto(true)}
        aria-expanded={false}
        aria-controls={FORM_ID}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add_circle</span>
        Agregar gestión
      </button>
    );
  }

  const idError = 'nueva-gestion-error';

  return (
    <form
      id={FORM_ID}
      onSubmit={guardar}
      noValidate
      aria-label="Nueva gestión logística"
      className="p-4 rounded-xl border border-[#ebedfe] bg-[#faf8ff] flex flex-col gap-3"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[#181b27]">
        <span className="material-symbols-outlined text-[18px] text-[#63518b]" aria-hidden="true">add_task</span>
        Nueva gestión
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="nueva-titulo" className={LABEL}>Título</label>
        <input
          id="nueva-titulo"
          type="text"
          className={`${INPUT} pl-4`}
          placeholder="Ej: Reservar salón"
          value={campos.titulo}
          disabled={estado === 'guardando'}
          onChange={(e) => actualizarCampo('titulo', e.target.value)}
          aria-invalid={errorField === 'titulo'}
          aria-describedby={error ? idError : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="nueva-fecha" className={LABEL}>Fecha objetivo</label>
          <input
            id="nueva-fecha"
            type="date"
            className={`${INPUT} pl-4`}
            value={campos.fecha_objetivo}
            disabled={estado === 'guardando'}
            onChange={(e) => actualizarCampo('fecha_objetivo', e.target.value)}
            aria-invalid={errorField === 'fecha'}
            aria-describedby={error ? idError : undefined}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="nueva-horas" className={LABEL}>Horas estimadas</label>
          <input
            id="nueva-horas"
            type="number"
            min="0.5"
            step="0.5"
            className={`${INPUT} pl-4`}
            value={campos.horas_estimadas}
            disabled={estado === 'guardando'}
            onChange={(e) => actualizarCampo('horas_estimadas', e.target.value)}
            aria-invalid={errorField === 'horas'}
            aria-describedby={error ? idError : undefined}
          />
        </div>
      </div>

      <div aria-live="polite">
        {error && <p id={idError} className={ERROR} role="alert">{error}</p>}
        {!error && ultimaAgregada && (
          <p className={EXITO} role="status">
            "{ultimaAgregada}" agregada al plan.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`}
          disabled={estado === 'guardando'}
          aria-live="polite"
        >
          {estado === 'guardando' ? 'Agregando…' : 'Agregar gestión'}
        </button>
        <button
          type="button"
          className={`${BOTON_SECUNDARIO} py-2 px-4 text-xs`}
          onClick={cerrar}
          disabled={estado === 'guardando'}
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}