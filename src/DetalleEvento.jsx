import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SuccessModal from './components/SuccessCard';
import {
  BOTON_ACENTO,
  BOTON_PELIGRO,
  BOTON_PRINCIPAL, BOTON_SECUNDARIO,
  BOTON_TERCIARIO,
  CampoHoras,
  CARD, CARD_HEADER_ICON,
  ERROR,
  FONT_HEADLINE,
  INPUT,
  INPUT_ICON,
  INPUT_WRAP,
  InputIcono,
  LABEL,
  PILL_ACTIVE,
  PILL_BASE,
  PILL_INACTIVE,
  SkeletonBloque,
  SkeletonLista,
} from './components/ui';
import { useFocusTrap } from './helpers/UseFocusTrap';
import { esFalloDeRed, MENSAJE_ERROR_RED } from './helpers/errors';
import {
  createSubtask,
  deleteEvent,
  deleteSubtask,
  getEvent,
  listSubtasks,
  updateEvent,
  updateSubtask,
  getProximaFechaDisponible,
} from './services/events';
import { DoodleConfeti, DoodleLista } from './components/Doodles';
import { GestionEstado } from './components/EstadoGestion';
import ProgresoBarra from './components/ProgresoBarra';
import { MC } from './helpers/microcopy';
import { useTituloPagina } from './helpers/useTituloPagina';


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

// Esqueleto de la vista mientras carga el evento: migas, título, tarjeta del evento,
// progreso y plan logístico, con la misma forma que la pantalla final.
function DetalleEventoSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Cargando evento…</span>
      <div aria-hidden="true" className="flex flex-col gap-2 pb-16">
        <SkeletonBloque className="mb-2 h-3 w-48" />
        <SkeletonBloque className="mb-4 h-8 w-2/3 max-w-md" />

        <div className="flex flex-col gap-8">
          <div className={CARD}>
            <div className="flex items-center gap-3">
              <SkeletonBloque className="h-10 w-10 flex-shrink-0 !rounded-xl" />
              <SkeletonBloque className="h-5 w-40" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <SkeletonBloque className="h-3 w-24" />
                  <SkeletonBloque className="h-5 w-3/4" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <SkeletonBloque className="h-9 w-24 !rounded-xl" />
              <SkeletonBloque className="h-9 w-24 !rounded-xl" />
            </div>
          </div>

          <div className={`${CARD} !gap-3`}>
            <SkeletonBloque className="h-5 w-48" />
            <SkeletonBloque className="h-3 w-full !rounded-full" />
          </div>

          <div className={CARD}>
            <div className="flex items-center gap-3 border-b border-[#ebedfe] pb-4">
              <SkeletonBloque className="h-10 w-10 flex-shrink-0 !rounded-xl" />
              <SkeletonBloque className="h-5 w-36" />
            </div>
            <SkeletonLista filas={2} etiqueta="" conIcono={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DetalleEvento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pageStatus, setPageStatus] = useState('loading'); // loading | ok | notfound | error
  const [evento, setEvento] = useState(null);
  const [subtareas, setSubtareas] = useState([]);

  useTituloPagina(evento ? evento.nombre : 'Evento');

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
  // Botón "Agregar gestión" del encabezado del plan: cada clic sube la señal y el
  // formulario se abre (o recibe el foco si ya estaba abierto).
  const [senalNueva, setSenalNueva] = useState(0);
  const agregarBtnRef = useRef(null);

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
    return <DetalleEventoSkeleton />;
  }

  if (pageStatus === 'notfound') {
    return (
      <div className={CARD}>
        <h1 className={`${FONT_HEADLINE} text-2xl font-extrabold text-[#181b27]`}>Evento no encontrado</h1>
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

  const claveProgreso = subtareas.map((s) => `${s.id}:${s.estado}`).join('|');

  return (
    <div className="flex flex-col gap-2 pb-16">
      <nav aria-label="Ruta de navegación" className="mb-2">
        <ol className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#625d66] flex-wrap">
          <li>
            <Link to="/evento" className="underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#63518b]">Mis Eventos</Link>
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
            <span className="text-[#63518b] font-bold" aria-current="page">{evento.nombre}</span>
          </li>
        </ol>
      </nav>

      {/* Cabecera: título y progreso juntos (como en /progreso), para ver de un vistazo
          cómo va el evento antes de entrar al detalle. */}
      <div className={`${CARD} relative mb-2 overflow-hidden !gap-5`}>
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-14 -left-10 h-56 w-56 rounded-full bg-gradient-to-br from-[#d2e4ff] via-[#e4d9ff] to-transparent opacity-50 blur-2xl" />
          <DoodleConfeti className="absolute -top-1 right-3 hidden h-20 w-36 opacity-70 sm:block" />
        </div>

        <div className="relative flex flex-col gap-1 sm:pr-40">
          {/* tabIndex=-1: no entra en el orden de tab, solo recibe foco por programa */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={`${FONT_HEADLINE} text-2xl sm:text-3xl font-extrabold text-[#181b27] tracking-tight focus:outline-none`}
          >
            {evento.nombre}
          </h1>
        </div>

        <section aria-labelledby="progreso-evento-heading" className="relative flex flex-col gap-2">
          <h2 id="progreso-evento-heading" className={`${FONT_HEADLINE} text-sm font-bold text-[#181b27]`}>
            {MC.progreso.titulo}
          </h2>
          <ProgresoBarra eventoId={id} claveActualizacion={claveProgreso} />
        </section>
      </div>

      <div className="flex flex-col gap-8">
        {/* Datos del evento arriba, luego el plan logístico. */}
        <EventoCard
          evento={evento}
          onGuardado={(actualizado) => setEvento(actualizado)}
          onEliminado={() => navigate('/evento')}
          onFeedback={mostrarFeedback}
        />

        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#ebedfe]">
            <div className="flex items-center gap-3">
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
                  <p className="text-xs text-[#625d66]">
                    {subtareas.length} {subtareas.length === 1 ? 'gestión' : 'gestiones'} en el plan
                  </p>
                )}
              </div>
            </div>

            <button
              ref={agregarBtnRef}
              type="button"
              className={`${BOTON_PRINCIPAL} w-full sm:w-auto`}
              onClick={() => setSenalNueva((n) => n + 1)}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_circle</span>
              Agregar gestión
            </button>
          </div>

          {/* El formulario se abre aquí arriba (no al final de la lista): con muchas
              gestiones no hay que bajar hasta el fondo para agregar una. */}
          <NuevaGestionForm
            eventoId={id}
            senalAbrir={senalNueva}
            triggerRef={agregarBtnRef}
            onCreada={(nueva) => setSubtareas((prev) => [...prev, nueva])}
          />

          {subtareas.length === 0 && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <DoodleLista className="h-24 w-32" />
              <p className="text-[#49454f] italic">Este evento no tiene gestiones logísticas todavía.</p>
              <p className="text-sm text-[#625d66]">
                Usa «Agregar gestión» para crear la primera tarea del plan.
              </p>
            </div>
          )}

          {subtareas.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label={`${subtareas.length} gestiones logísticas`}>
              {subtareas.map((s) => (
                <li key={s.id}>
                  <SubtareaCard
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
                </li>
              ))}
            </ul>
          )}
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
            <dt className="inline-flex items-center gap-2 text-[#625d66]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">sell</span>
              Tipo:
            </dt>
            <dd className="min-w-0 break-words font-semibold">{evento.tipo}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="inline-flex items-center gap-2 text-[#625d66]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_month</span>
              Fecha:
            </dt>
            <dd className="min-w-0 break-words font-semibold">{fechaInicial} {horaInicial}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="inline-flex items-center gap-2 text-[#625d66]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">contact_phone</span>
              {MC.contacto.etiquetaVista}
            </dt>
            <dd className="min-w-0 break-words font-semibold">{evento.cliente_contacto}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="inline-flex items-center gap-2 text-[#625d66]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">pin_drop</span>
              Lugar:
            </dt>
            <dd className="min-w-0 break-words font-semibold">{evento.lugar}</dd>
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
        <label htmlFor="ev-contacto" className={LABEL}>{MC.contacto.etiqueta}</label>
        <div className={INPUT_WRAP}>
          <span className={INPUT_ICON} aria-hidden="true">contact_phone</span>
          <input
            id="ev-contacto" type="text" className={INPUT} value={clienteContacto}
            autoComplete="off"
            placeholder={MC.contacto.placeholder}
            onChange={(e) => { setClienteContacto(e.target.value); limpiarErrorCampo('cliente_contacto'); }}
            aria-invalid={Boolean(fieldErrors.cliente_contacto)}
            aria-describedby={`ev-contacto-ayuda${fieldErrors.cliente_contacto ? ' ev-error-contacto' : ''}`}
          />
        </div>
        <p id="ev-contacto-ayuda" className="text-xs text-[#625d66]">{MC.contacto.ayuda}</p>
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
  const [errorMensaje, setErrorMensaje] = useState('');
  const [conflicto, setConflicto] = useState(null);
  // De dónde vino el conflicto: del formulario de edición o del de reprogramación.
  // El menú de alternativas es el mismo; solo cambian los datos que se guardan.
  const [origenConflicto, setOrigenConflicto] = useState('editar'); // 'editar' | 'reprogramar'

  const [buscandoFecha, setBuscandoFecha] = useState(false);
  const [fechaPropuesta, setFechaPropuesta] = useState(null);
  const [errorFechaPropuesta, setErrorFechaPropuesta] = useState(null);

  const [reprogramando, setReprogramando] = useState(false);
  const [fechaReprogramada, setFechaReprogramada] = useState(subtarea.fecha_objetivo);
  const [errorReprogramacion, setErrorReprogramacion] = useState(null);

  const reprogramarBtnRef = useRef(null);
  const reprogramarHeadingRef = useRef(null);
  const reprogramarDialogRef = useRef(null);

  const [titulo, setTitulo] = useState(subtarea.titulo);
  const [fechaObjetivo, setFechaObjetivo] = useState(subtarea.fecha_objetivo);
  const [horasEstimadas, setHorasEstimadas] = useState(subtarea.horas_estimadas);

  const editarBtnRef = useRef(null);
  const eliminarBtnRef = useRef(null);
  const confirmarHeadingRef = useRef(null);
  const confirmarDialogRef = useRef(null);
  const conflictoDialogRef = useRef(null);
  const conflictoHeadingRef = useRef(null);

  useEffect(() => {
    if (modo === 'editar') focusField(`sub-titulo-${subtarea.id}`);
  }, [modo, subtarea.id]);

  // Si la gestión cambia desde fuera del formulario de edición (por ejemplo, al reprogramarla),
  // los campos de edición se actualizan para que "Editar" no vuelva a guardar la fecha vieja.
  useEffect(() => {
    if (modo !== 'ver') return;
    setTitulo(subtarea.titulo);
    setFechaObjetivo(subtarea.fecha_objetivo);
    setHorasEstimadas(subtarea.horas_estimadas);
  }, [modo, subtarea.titulo, subtarea.fecha_objetivo, subtarea.horas_estimadas]);

  useEffect(() => {
    if (confirmando) confirmarHeadingRef.current?.focus();
  }, [confirmando]);

  useEffect(() => {
    if (reprogramando) {
      reprogramarHeadingRef.current?.focus();
    }
  }, [reprogramando]);

  useEffect(() => {
  if (conflicto) {
    conflictoHeadingRef.current?.focus();
  }
}, [conflicto]);

  useEscapeToClose(confirmando, () => {
    setConfirmando(false);
    eliminarBtnRef.current?.focus();
  });

  useEscapeToClose(reprogramando, cerrarReprogramacion);

  useEscapeToClose(conflicto, () => {
  setConflicto(null);
  if (origenConflicto === 'reprogramar') reprogramarBtnRef.current?.focus();
  else editarBtnRef.current?.focus();
  });

  useFocusTrap(confirmando, confirmarDialogRef);

  useFocusTrap(reprogramando, reprogramarDialogRef);

  useFocusTrap(conflicto, conflictoDialogRef);

  function cancelar() {
    setTitulo(subtarea.titulo);
    setFechaObjetivo(subtarea.fecha_objetivo);
    setHorasEstimadas(subtarea.horas_estimadas);
    setErrorField(null);
    setModo('ver');
    editarBtnRef.current?.focus();
  }

    function abrirReprogramacion() {
    setFechaReprogramada(subtarea.fecha_objetivo);
    setErrorReprogramacion(null);
    setReprogramando(true);
  }

  function cerrarReprogramacion() {
    if (estado === 'reprogramando') return;

    setReprogramando(false);
    setErrorReprogramacion(null);
    reprogramarBtnRef.current?.focus();
  }

  async function guardarReprogramacion(e) {
    e.preventDefault();

    setEstado('reprogramando');
    setErrorReprogramacion(null);

    try {
      const actualizada = await updateSubtask(eventoId, subtarea.id, {
        fecha_objetivo: fechaReprogramada,
      });

      onGuardada(actualizada);
      setEstado('idle');
      setReprogramando(false);

      onFeedback({
        titulo: 'Gestión reprogramada',
        mensaje: 'La nueva fecha se guardó correctamente.',
        focoRef: reprogramarBtnRef,
      });
    } catch (err) {
      setEstado('idle');

      // Sobrecarga diaria: se muestra el mismo menú de alternativas que al editar.
      if (err.status === 409 && err.conflicto) {
        setOrigenConflicto('reprogramar');
        setConflicto(err.conflicto);
        setFechaPropuesta(null);
        setErrorFechaPropuesta(null);
        setErrorReprogramacion(null);
        setReprogramando(false);
        return;
      }

      const fe = err.fieldErrors || {};

      if (fe.fecha_objetivo?.[0]) {
        setErrorReprogramacion(fe.fecha_objetivo[0]);
      } else {
        setErrorReprogramacion(
          mensajeError(err, 'No pudimos reprogramar la gestión. Inténtalo de nuevo.')
        );
      }

      reprogramarHeadingRef.current?.focus();
    }
  }


  async function buscarProximaFecha() {
    const reprogramar = origenConflicto === 'reprogramar';
    const fechaBase = reprogramar ? fechaReprogramada : fechaObjetivo;
    const horasBase = reprogramar ? subtarea.horas_estimadas : horasEstimadas;

    if (!conflicto || !fechaBase || !horasBase) {
      return;
    }

    setBuscandoFecha(true);
    setErrorFechaPropuesta(null);
    setFechaPropuesta(null);

    try {
      const resultado = await getProximaFechaDisponible(
        eventoId,
        fechaBase,
        horasBase,
        subtarea.id
      );

      if (resultado.disponible && resultado.fecha) {
        setFechaPropuesta(resultado.fecha);
      } else {
        setErrorFechaPropuesta(
          resultado.mensaje ||
            'No encontramos una fecha disponible antes del evento.'
        );
      }
    } catch (err) {
      setErrorFechaPropuesta(
        mensajeError(err, 'No pudimos buscar una fecha disponible.')
      );
    } finally {
      setBuscandoFecha(false);
    }
  }

  // Reprogramación: guarda solo la nueva fecha (la propuesta, o la elegida con las horas reducidas).
  async function guardarReprogramacionResuelta(cambios, mensaje) {
    setEstado('guardando');
    try {
      const actualizada = await updateSubtask(eventoId, subtarea.id, cambios);
      onGuardada(actualizada);
      setEstado('idle');
      setConflicto(null);
      setFechaPropuesta(null);
      setErrorFechaPropuesta(null);
      onFeedback({
        titulo: 'Gestión reprogramada',
        mensaje,
        focoRef: reprogramarBtnRef,
      });
    } catch (err) {
      setEstado('idle');

      if (err.status === 409 && err.conflicto) {
        setConflicto(err.conflicto);
        setFechaPropuesta(null);
        setErrorFechaPropuesta(null);
        return;
      }

      setConflicto(null);
      onFeedback({
        variant: 'error',
        titulo: 'No pudimos reprogramar la gestión',
        mensaje: mensajeError(err, 'Inténtalo de nuevo.'),
        focoRef: reprogramarBtnRef,
      });
    }
  }

  // "Volver a editar" (o "Elegir otra fecha" si venimos de reprogramar): cierra el conflicto
  // y devuelve a la persona al formulario donde estaba.
  function volverDesdeConflicto() {
    setConflicto(null);
    setFechaPropuesta(null);
    setErrorFechaPropuesta(null);
    if (origenConflicto === 'reprogramar') {
      setReprogramando(true);
    } else {
      document.getElementById(`sub-fecha-${subtarea.id}`)?.focus();
    }
  }

  async function guardarConFechaPropuesta() {
    if (!fechaPropuesta) return;

    if (origenConflicto === 'reprogramar') {
      await guardarReprogramacionResuelta(
        { fecha_objetivo: fechaPropuesta },
        'La nueva fecha se guardó correctamente.'
      );
      return;
    }

    setFechaObjetivo(fechaPropuesta);
    setEstado('guardando');
    setErrorField(null);
    setErrorMensaje('');

    try {
      const actualizada = await updateSubtask(eventoId, subtarea.id, {
        titulo: titulo.trim(),
        fecha_objetivo: fechaPropuesta,
        horas_estimadas: horasEstimadas,
      });

      onGuardada(actualizada);
      setEstado('idle');
      setConflicto(null);
      setFechaPropuesta(null);
      setErrorFechaPropuesta(null);
      setModo('ver');

      onFeedback({
        titulo: 'Gestión editada',
        mensaje: 'Los cambios se guardaron correctamente.',
        focoRef: editarBtnRef,
      });
    } catch (err) {
      setEstado('idle');

      if (err.status === 409 && err.conflicto) {
        setOrigenConflicto('editar');
        setConflicto(err.conflicto);
        setFechaPropuesta(null);
        setErrorFechaPropuesta(null);
        return;
      }

      onFeedback({
        variant: 'error',
        titulo: 'No pudimos guardar la gestión',
        mensaje: mensajeError(err, 'Inténtalo de nuevo.'),
        focoRef: editarBtnRef,
      });
    }
  }

  async function guardar(e, horasOverride = null) {
    e?.preventDefault();

    setEstado('guardando');
    setErrorField(null);
    setErrorMensaje('');

    const horasAguardar = horasOverride ?? horasEstimadas;

    try {
      const actualizada = await updateSubtask(eventoId, subtarea.id, {
        titulo: titulo.trim(),
        fecha_objetivo: fechaObjetivo,
        horas_estimadas: horasAguardar,
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
      if (err.status === 409 && err.conflicto) {
        setEstado('idle');
        setErrorField(null);
        setErrorMensaje('');
        setOrigenConflicto('editar');
        setConflicto(err.conflicto);
        return;
      }

      setEstado('error');
      const fe = err.fieldErrors || {};
      let campo = null;
      let mensajeCampo = '';

      if (fe.titulo) {
        campo = 'titulo';
        mensajeCampo = Array.isArray(fe.titulo) ? fe.titulo[0] : fe.titulo;
      } else if (fe.fecha_objetivo) {
        campo = 'fecha';
        mensajeCampo = Array.isArray(fe.fecha_objetivo)
          ? fe.fecha_objetivo[0]
          : fe.fecha_objetivo;
      } else if (fe.horas_estimadas) {
        campo = 'horas';
        mensajeCampo = Array.isArray(fe.horas_estimadas)
          ? fe.horas_estimadas[0]
          : fe.horas_estimadas;
      }

      setErrorField(campo);

      if (campo) {
        const mensaje = mensajeCampo || mensajeError(
          err,
          'Revisa este campo e inténtalo de nuevo.'
        );

        setErrorMensaje(mensaje);

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

  async function resolverReduciendoHoras() {
    const horasDisponibles = Number(conflicto?.horas_disponibles);

    if (!conflicto || !Number.isFinite(horasDisponibles) || horasDisponibles <= 0) {
      return;
    }

    if (origenConflicto === 'reprogramar') {
      await guardarReprogramacionResuelta(
        { fecha_objetivo: fechaReprogramada, horas_estimadas: horasDisponibles },
        `La gestión se reprogramó y sus horas se redujeron a ${horasDisponibles} h.`
      );
      return;
    }

    setHorasEstimadas(horasDisponibles.toString());
    setConflicto(null);

    await guardar(null, horasDisponibles);
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

  // Menú de alternativas ante un conflicto de sobrecarga: el mismo al editar y al reprogramar.
  const panelConflicto = conflicto ? (
        <div
          ref={conflictoDialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`conflicto-heading-${subtarea.id}`}
          className="p-4 rounded-xl border border-[#ba1a1a]/30 bg-[#fff8f7] shadow-sm"
        >
          <h3
            id={`conflicto-heading-${subtarea.id}`}
            ref={conflictoHeadingRef}
            tabIndex={-1}
            className={`${FONT_HEADLINE} mb-3 text-sm font-bold text-[#181b27] focus:outline-none`}
          >
            Hay un conflicto de planificación
          </h3>

          <p className="text-sm text-[#181b27] mb-3">
            Esta gestión haría que el tiempo planificado para el día supere tu límite diario.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Fecha</span>
              <strong>{conflicto.fecha}</strong>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Horas ya planificadas</span>
              <strong>{conflicto.horas_ya_planificadas} h</strong>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Horas de esta gestión</span>
              <strong>{conflicto.horas_gestion} h</strong>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Total planificado</span>
              <strong>{conflicto.horas_total} h</strong>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Límite diario</span>
              <strong>{conflicto.limite_diario} h</strong>
            </div>

            <div className="p-3 rounded-lg bg-[#ffdad6]/30 border border-[#ba1a1a]/20">
              <span className="block text-xs text-[#ba1a1a]">Exceso</span>
              <strong className="text-[#ba1a1a]">{conflicto.exceso} h</strong>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-[#625d66] mb-3">
              Tienes {conflicto.horas_disponibles} h disponibles dentro de tu límite diario.
            </p>

            <div className="flex gap-3 flex-wrap">
              {Number(conflicto.horas_disponibles) > 0 ? (
                <button
                  type="button"
                  className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`}
                  onClick={resolverReduciendoHoras}
                  disabled={estado === 'guardando'}
                >
                  Reducir a {conflicto.horas_disponibles} h y guardar
                </button>
              ) : (
                <button
                  type="button"
                  className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`}
                  onClick={buscarProximaFecha}
                  disabled={estado === 'guardando' || buscandoFecha}
                >
                  {buscandoFecha
                    ? 'Buscando fecha…'
                    : 'Mover a la próxima fecha disponible'}
                </button>
              )}

              <button
                type="button"
                className={`${BOTON_SECUNDARIO} py-2 px-4 text-xs`}
                onClick={volverDesdeConflicto}
                disabled={estado === 'guardando'}
              >
                {origenConflicto === 'reprogramar' ? 'Elegir otra fecha' : 'Volver a editar'}
              </button>
            </div>

            {fechaPropuesta && (
              <div className="mt-3 rounded-lg border border-[#e5e7f8] bg-white p-3">
                <p className="text-sm text-[#181b27]">
                  Próxima fecha disponible:
                  <strong className="ml-1">{fechaPropuesta}</strong>
                </p>
                <p className="mt-1 text-xs text-[#625d66]">
                  Revisa la fecha antes de confirmar el cambio.
                </p>
              </div>
            )}

            {fechaPropuesta && (
              <button
                type="button"
                className={`${BOTON_PRINCIPAL} mt-3 py-2 px-4 text-xs`}
                disabled={estado === 'guardando'}
                onClick={() => guardarConFechaPropuesta()}
              >
                Confirmar fecha y guardar
              </button>
            )}

            {errorFechaPropuesta && (
              <p className="mt-3 text-sm text-[#ba1a1a]" role="alert">
                {errorFechaPropuesta}
              </p>
            )}
          </div>
        </div>
  ) : null;

  if (modo === 'ver') {
    return (
      <div className="p-4 rounded-xl border border-[#ebedfe] bg-[#faf8ff] flex flex-col gap-3 transition-shadow hover:shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#181b27]">
            <span className="material-symbols-outlined text-[18px] text-[#63518b]" aria-hidden="true">task_alt</span>
            {subtarea.titulo}
          </h3>
          <p className="text-xs text-[#625d66] flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">event</span>
              {subtarea.fecha_objetivo}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">hourglass_top</span>
              Duración: {subtarea.horas_estimadas} h
            </span>
          </p>
        </div>

        {/* Una sola fila: estado + acciones. "Reprogramar" va destacado (para cambiar la
            fecha); "Editar" queda en gris y al final para que no se use por error. */}
        <GestionEstado
          eventoId={eventoId}
          gestion={subtarea}
          onActualizada={onGuardada}
          variant="fila"
          extraAcciones={
            <>
              <button
                ref={reprogramarBtnRef}
                type="button"
                className={BOTON_ACENTO}
                onClick={abrirReprogramacion}
                aria-label={`Reprogramar gestión: ${subtarea.titulo}`}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">event_repeat</span>
                Reprogramar
              </button>

              <span className="flex items-center gap-1 sm:ml-auto">
                <button
                  ref={editarBtnRef}
                  type="button"
                  className={BOTON_TERCIARIO}
                  onClick={() => setModo('editar')}
                  aria-label={`Editar gestión: ${subtarea.titulo}`}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                  Editar
                </button>

                {!confirmando && (
                  <button
                    ref={eliminarBtnRef}
                    type="button"
                    className={`${BOTON_PELIGRO} py-1.5 px-3 text-xs`}
                    onClick={() => setConfirmando(true)}
                    aria-label={`Eliminar gestión: ${subtarea.titulo}`}
                  >
                    Eliminar
                  </button>
                )}
              </span>
            </>
          }
        />

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

        {reprogramando && (
          <div
            ref={reprogramarDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reprogramar-heading-${subtarea.id}`}
            className="p-4 rounded-xl border border-[#e5e7f8] bg-white shadow-sm"
          >
            <h3
              id={`reprogramar-heading-${subtarea.id}`}
              ref={reprogramarHeadingRef}
              tabIndex={-1}
              className={`${FONT_HEADLINE} mb-3 text-sm font-bold text-[#181b27] focus:outline-none`}
            >
              Reprogramar gestión
            </h3>

            <form onSubmit={guardarReprogramacion} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`reprogramar-fecha-${subtarea.id}`}
                  className={LABEL}
                >
                  Nueva fecha objetivo
                </label>

                <InputIcono
                  icon="calendar_month"
                  id={`reprogramar-fecha-${subtarea.id}`}
                  type="date"
                  value={fechaReprogramada}
                  disabled={estado === 'reprogramando'}
                  onChange={(e) => {
                    setFechaReprogramada(e.target.value);
                    setErrorReprogramacion(null);
                  }}
                  aria-invalid={Boolean(errorReprogramacion)}
                  aria-describedby={
                    errorReprogramacion
                      ? `reprogramar-error-${subtarea.id}`
                      : undefined
                  }
                />

                {errorReprogramacion && (
                  <p
                    id={`reprogramar-error-${subtarea.id}`}
                    className={ERROR}
                    role="alert"
                  >
                    {errorReprogramacion}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`}
                  disabled={estado === 'reprogramando'}
                  aria-live="polite"
                >
                  {estado === 'reprogramando'
                    ? 'Reprogramando…'
                    : 'Reprogramar'}
                </button>

                <button
                  type="button"
                  className={`${BOTON_SECUNDARIO} py-2 px-4 text-xs`}
                  onClick={cerrarReprogramacion}
                  disabled={estado === 'reprogramando'}
                >
                  Cancelar
                </button>
              </div>       
            </form>
          </div>
        )}

        {panelConflicto}
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
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#181b27]">
        <span className="material-symbols-outlined text-[18px] text-[#63518b]" aria-hidden="true">edit</span>
        Editar gestión
      </h3>

      <div className="flex flex-col gap-1">
        <label htmlFor={`sub-titulo-${subtarea.id}`} className={LABEL}>Título</label>
        <InputIcono icon="title"
          id={`sub-titulo-${subtarea.id}`} type="text" value={titulo}
          onChange={(e) => { setTitulo(e.target.value); setErrorField(null); }}
          aria-invalid={errorField === 'titulo'}
          aria-describedby={errorField === 'titulo' ? idError : undefined}
        />
        {errorField === 'titulo' && <p id={idError} className={ERROR} role="alert">Este campo es obligatorio.</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`sub-fecha-${subtarea.id}`} className={LABEL}>Fecha objetivo</label>
          <InputIcono icon="event"
            id={`sub-fecha-${subtarea.id}`} type="date" value={fechaObjetivo}
            onChange={(e) => { setFechaObjetivo(e.target.value); setErrorField(null); setErrorMensaje(''); }}
            aria-invalid={errorField === 'fecha'}
            aria-describedby={`sub-fecha-ayuda-${subtarea.id}${errorField === 'fecha' ? ` sub-fecha-error-${subtarea.id}` : ''}`}
          />
          <p id={`sub-fecha-ayuda-${subtarea.id}`} className="text-xs text-[#625d66]">
            ¿Solo quieres moverla de día? Cancela y usa «Reprogramar».
          </p>
          {errorField === 'fecha' && (
            <p id={`sub-fecha-error-${subtarea.id}`} className={ERROR} role="alert">
              {errorMensaje}
            </p>
          )}
        </div>
        <CampoHoras
          id={`sub-horas-${subtarea.id}`}
          value={horasEstimadas}
          onChange={(e) => { setHorasEstimadas(e.target.value); setErrorField(null); }}
          aria-invalid={errorField === 'horas'}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`} disabled={estado === 'guardando'} aria-live="polite">
          {estado === 'guardando' ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className={`${BOTON_SECUNDARIO} py-2 px-4 text-xs`} onClick={cancelar} disabled={estado === 'guardando'}>
          Cancelar
        </button>
      </div>
      {panelConflicto}
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

function NuevaGestionForm({ eventoId, onCreada, senalAbrir = 0, triggerRef = null }) {
  const [abierto, setAbierto] = useState(false);
  const [campos, setCampos] = useState(nuevaGestionVacia());
  const [estado, setEstado] = useState('idle'); // idle | guardando | error
  const [error, setError] = useState(null);
  const [errorField, setErrorField] = useState(null);
  const [ultimaAgregada, setUltimaAgregada] = useState(null);
  const [conflicto, setConflicto] = useState(null);

  const [buscandoFecha, setBuscandoFecha] = useState(false);
  const [fechaPropuesta, setFechaPropuesta] = useState(null);
  const [errorFechaPropuesta, setErrorFechaPropuesta] = useState(null);

  const refLocal = useRef(null);
  const toggleBtnRef = triggerRef ?? refLocal; // a dónde vuelve el foco al cerrar
  const conflictoDialogRef = useRef(null);
  const conflictoHeadingRef = useRef(null);

  useEffect(() => {
    if (conflicto) conflictoHeadingRef.current?.focus();
  }, [conflicto]);

useFocusTrap(conflicto, conflictoDialogRef);

  useEffect(() => {
    if (abierto) focusField('nueva-titulo');
  }, [abierto]);

  // Señal del botón "Agregar gestión" del encabezado: abre el formulario, o solo mueve
  // el foco al título si ya estaba abierto.
  useEffect(() => {
    if (!senalAbrir) return;
    setAbierto(true);
    focusField('nueva-titulo');
  }, [senalAbrir]);

  useEscapeToClose(abierto && !conflicto, () => {
    setAbierto(false);
    setCampos(nuevaGestionVacia());
    setError(null);
    setErrorField(null);
    setUltimaAgregada(null);
    toggleBtnRef.current?.focus();
  });

  useEscapeToClose(conflicto, () => {
    setConflicto(null);
    focusField('nueva-horas');
  });

  function actualizarCampo(campo, valor) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
    setFechaPropuesta(null);
    setErrorFechaPropuesta(null);
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

  
async function buscarProximaFecha() {
  if (!conflicto || !campos.fecha_objetivo || !campos.horas_estimadas) {
    return;
  }

  setBuscandoFecha(true);
  setErrorFechaPropuesta(null);
  setFechaPropuesta(null);

  try {
    const resultado = await getProximaFechaDisponible(
      eventoId,
      campos.fecha_objetivo,
      campos.horas_estimadas
    );

    if (resultado.disponible && resultado.fecha) {
      setFechaPropuesta(resultado.fecha);
    } else {
      setErrorFechaPropuesta(
        resultado.mensaje ||
          'No encontramos una fecha disponible antes del evento.'
      );
    }
  } catch (err) {
    setErrorFechaPropuesta(
      mensajeError(err, 'No pudimos buscar una fecha disponible.')
    );
  } finally {
    setBuscandoFecha(false);
  }
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
      if (err.status === 409 && err.conflicto) {
        setEstado('idle');
        setError(null);
        setErrorField(null);
        setConflicto(err.conflicto);
        return;
      }

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

  
  async function resolverReduciendoHoras() {
    const horasDisponibles = Number(conflicto?.horas_disponibles);

    if (
      !conflicto ||
      !Number.isFinite(horasDisponibles) ||
      horasDisponibles <= 0
    ) {
      return;
    }

    setEstado('guardando');
    setError(null);
    setErrorField(null);
    setConflicto(null);

    try {
      const creada = await createSubtask(eventoId, {
        titulo: campos.titulo.trim(),
        fecha_objetivo: campos.fecha_objetivo,
        horas_estimadas: horasDisponibles,
      });

      onCreada(creada);
      setUltimaAgregada(creada.titulo);
      setCampos(nuevaGestionVacia());
      setEstado('idle');
      focusField('nueva-titulo');
    } catch (err) {
      setEstado('idle');

      if (err.status === 409 && err.conflicto) {
        setConflicto(err.conflicto);
        return;
      }

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

  function volverAEditar() {
    setConflicto(null);
    setFechaPropuesta(null);
    setErrorFechaPropuesta(null);
    focusField('nueva-fecha');
  }


  // Cerrado: no se dibuja nada; el botón del encabezado del plan lo abre.
  if (!abierto) return null;

  const idError = 'nueva-gestion-error';

  return (
    <form
      id={FORM_ID}
      onSubmit={guardar}
      noValidate
      aria-label="Nueva gestión logística"
      className="p-4 rounded-xl border border-[#ebedfe] bg-[#faf8ff] flex flex-col gap-3"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#181b27]">
        <span className="material-symbols-outlined text-[18px] text-[#63518b]" aria-hidden="true">add_task</span>
        Nueva gestión
      </h3>

      <div className="flex flex-col gap-1">
        <label htmlFor="nueva-titulo" className={LABEL}>Título</label>
        <InputIcono icon="edit_calendar"
          id="nueva-titulo"
          type="text"
          placeholder="Ej: Reservar salón"
          value={campos.titulo}
          disabled={estado === 'guardando'}
          onChange={(e) => actualizarCampo('titulo', e.target.value)}
          aria-invalid={errorField === 'titulo'}
          aria-describedby={error ? idError : undefined}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="nueva-fecha" className={LABEL}>Fecha objetivo</label>
          <InputIcono icon="calendar_month"
            id="nueva-fecha"
            type="date"
            value={campos.fecha_objetivo}
            disabled={estado === 'guardando'}
            onChange={(e) => actualizarCampo('fecha_objetivo', e.target.value)}
            aria-invalid={errorField === 'fecha'}
            aria-describedby={error ? idError : undefined}
          />
        </div>
        <CampoHoras
          id="nueva-horas"
          value={campos.horas_estimadas}
          disabled={estado === 'guardando'}
          onChange={(e) => actualizarCampo('horas_estimadas', e.target.value)}
          aria-invalid={errorField === 'horas'}
          describedBy={error ? idError : undefined}
        />
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
      
      {conflicto && (
        <div
          ref={conflictoDialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="conflicto-heading-nueva"
          className="p-4 rounded-xl border border-[#ba1a1a]/30 bg-[#fff8f7] shadow-sm"
        >
          <h3
            id="conflicto-heading-nueva"
            ref={conflictoHeadingRef}
            tabIndex={-1}
            className={`${FONT_HEADLINE} mb-3 text-sm font-bold text-[#181b27] focus:outline-none`}
          >
            Hay un conflicto de planificación
          </h3>

          <p className="text-sm text-[#181b27] mb-3">
            Esta gestión haría que el tiempo planificado para el día supere tu límite diario.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Fecha</span>
              <strong>{conflicto.fecha}</strong>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Horas ya planificadas</span>
              <strong>{conflicto.horas_ya_planificadas} h</strong>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Horas de esta gestión</span>
              <strong>{conflicto.horas_gestion} h</strong>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Total planificado</span>
              <strong>{conflicto.horas_total} h</strong>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#e5e7f8]">
              <span className="block text-xs text-[#625d66]">Límite diario</span>
              <strong>{conflicto.limite_diario} h</strong>
            </div>

            <div className="p-3 rounded-lg bg-[#ffdad6]/30 border border-[#ba1a1a]/20">
              <span className="block text-xs text-[#ba1a1a]">Exceso</span>
              <strong className="text-[#ba1a1a]">{conflicto.exceso} h</strong>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-[#625d66]">
              Tienes {conflicto.horas_disponibles} h disponibles dentro de tu límite diario.
            </p>
          </div>

          <div className="mt-4 flex gap-3 flex-wrap">
            
          {Number(conflicto.horas_disponibles) > 0 ? (
            <button
              type="button"
              className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`}
              onClick={resolverReduciendoHoras}
              disabled={estado === 'guardando'}
            >
              Reducir a {conflicto.horas_disponibles} h y guardar
            </button>
          ) : (
            <button
              type="button"
              className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`}
              onClick={buscarProximaFecha}
              disabled={estado === 'guardando' || buscandoFecha}
            >
              {buscandoFecha
                ? 'Buscando fecha…'
                : 'Mover a la próxima fecha disponible'}
            </button>
          )}
          
          {fechaPropuesta && (
            <div className="mt-3 rounded-lg border border-[#e5e7f8] bg-white p-3">
              <p className="text-sm text-[#181b27]">
                Próxima fecha disponible:
                <strong className="ml-1">{fechaPropuesta}</strong>
              </p>
              <p className="mt-1 text-xs text-[#625d66]">
                Revisa la fecha antes de confirmar el cambio.
              </p>
            </div>
          )}

          
          {fechaPropuesta && (
            <button
              type="button"
              className={`${BOTON_PRINCIPAL} py-2 px-4 text-xs`}
              disabled={estado === 'guardando'}
              onClick={async () => {
                setEstado('guardando');
                setError(null);

                try {
                  const creada = await createSubtask(eventoId, {
                    titulo: campos.titulo.trim(),
                    fecha_objetivo: fechaPropuesta,
                    horas_estimadas: campos.horas_estimadas,
                  });

                  onCreada(creada);
                  setUltimaAgregada(creada.titulo);
                  setCampos(nuevaGestionVacia());
                  setConflicto(null);
                  setFechaPropuesta(null);
                  setErrorFechaPropuesta(null);
                  setEstado('idle');
                  focusField('nueva-titulo');
                } catch (err) {
                  setEstado('idle');

                  if (err.status === 409 && err.conflicto) {
                    setConflicto(err.conflicto);
                    setFechaPropuesta(null);
                    return;
                  }

                  setError(mensajeError(err, 'No pudimos agregar la gestión.'));
                }
              }}
            >
              Confirmar fecha y guardar
            </button>
          )}


          {errorFechaPropuesta && (
            <p className="mt-3 text-sm text-[#ba1a1a]" role="alert">
              {errorFechaPropuesta}
            </p>
          )}
            <button
              type="button"
              className={`${BOTON_SECUNDARIO} py-2 px-4 text-xs`}
              onClick={volverAEditar}
              disabled={estado === 'guardando'}
            >
              Volver a editar
            </button>
          </div>
        </div>
      )}
    </form>
  );
}