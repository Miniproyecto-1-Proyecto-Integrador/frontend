import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, createSubtask } from './services/events';
import {
  FONT_HEADLINE, CARD, CARD_HEADER_ICON, INPUT_WRAP, INPUT_ICON, INPUT, LABEL, ERROR,
  BOTON_PRINCIPAL, BOTON_SECUNDARIO, PILL_BASE, PILL_ACTIVE, PILL_INACTIVE,
} from './components/ui';

// El backend acepta "tipo" como texto libre; estas son solo sugerencias
// visuales (pills). "Otro" abre un campo de texto normal.
const TIPOS_SUGERIDOS = ['Boda', 'Social', 'Corporativo', 'Cumpleaños', 'Otro'];

function focusField(id) {
  document.getElementById(id)?.focus();
}

function nuevaGestionVacia() {
  return {
    id: crypto.randomUUID(),
    titulo: '', fecha_objetivo: '', horas_estimadas: '', status: 'pending', error: null, errorField: null,
  };
}

/**
 * Crea el evento y, en el mismo formulario, su plan inicial de gestiones
 * logísticas. Si el evento se crea pero alguna gestión falla, el formulario
 * no vuelve a crear el evento: solo reintenta las gestiones pendientes.
 *
 * Toda la validación de campos la hace el backend; este componente solo
 * refleja los errores que recibe en la respuesta (fieldErrors).
 */
export default function CrearEvento() {
  const navigate = useNavigate();

  // Datos del evento
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipoPersonalizado, setTipoPersonalizado] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [clienteContacto, setClienteContacto] = useState('');
  const [lugar, setLugar] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Gestiones logísticas del plan inicial
  const [gestiones, setGestiones] = useState([]);

  // Estado general del formulario
  const [eventoId, setEventoId] = useState(null);
  const [formStatus, setFormStatus] = useState('idle'); // idle | submitting | success | error
  const [formError, setFormError] = useState(null);

  // Foco en el <h1> al montar: en una SPA no hay recarga de página, así
  // que sin esto un usuario de lector de pantalla no se entera de que
  // "navegó" a esta vista (mismo patrón que en el detalle del evento).
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (formStatus !== 'success' || !eventoId) return;
    const timeoutId = setTimeout(() => navigate(`/evento/${eventoId}`), 1200);
    return () => clearTimeout(timeoutId);
  }, [formStatus, eventoId, navigate]);

  function agregarGestion() {
    setGestiones((prev) => [...prev, nuevaGestionVacia()]);
  }

  function eliminarGestion(id) {
    setGestiones((prev) => prev.filter((g) => g.id !== id));
  }

  function actualizarGestion(id, campo, valor) {
    setGestiones((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, [campo]: valor, error: null, errorField: null, status: g.status === 'saved' ? g.status : 'pending' }
          : g
      )
    );
  }

  async function guardarGestionesPendientes(idEvento) {
    setFormStatus('submitting');
    let huboError = false;
    const actualizadas = [...gestiones];

    for (let i = 0; i < actualizadas.length; i++) {
      if (actualizadas[i].status === 'saved') continue;

      actualizadas[i] = { ...actualizadas[i], status: 'saving', error: null, errorField: null };
      setGestiones([...actualizadas]);

      try {
        await createSubtask(idEvento, {
          titulo: actualizadas[i].titulo.trim(),
          fecha_objetivo: actualizadas[i].fecha_objetivo,
          horas_estimadas: actualizadas[i].horas_estimadas,
        });
        actualizadas[i] = { ...actualizadas[i], status: 'saved', error: null, errorField: null };
      } catch (err) {
        huboError = true;
        let mensaje = 'No pudimos guardar esta gestión.';
        let errorField = null;
        if (err.fieldErrors?.titulo) { mensaje = err.fieldErrors.titulo[0]; errorField = 'titulo'; }
        else if (err.fieldErrors?.horas_estimadas) { mensaje = err.fieldErrors.horas_estimadas[0]; errorField = 'horas'; }
        else if (err.fieldErrors?.fecha_objetivo) { mensaje = err.fieldErrors.fecha_objetivo[0]; errorField = 'fecha'; }
        else if (err.message) mensaje = err.message;
        actualizadas[i] = { ...actualizadas[i], status: 'error', error: mensaje, errorField };
      }
      setGestiones([...actualizadas]);
    }

    if (huboError) {
      setFormStatus('error');
      setFormError('El evento se creó, pero algunas gestiones no se pudieron guardar. Revisa los mensajes abajo e inténtalo de nuevo.');
      const primeraConError = actualizadas.find((g) => g.status === 'error');
      if (primeraConError?.errorField) {
        focusField(`gestion-${primeraConError.errorField}-${primeraConError.id}`);
      }
    } else {
      setFormStatus('success');
      setFormError(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (eventoId) {
      await guardarGestionesPendientes(eventoId);
      return;
    }

    setFormStatus('submitting');
    setFormError(null);
    setFieldErrors({});

    const tipoFinal = tipo === 'Otro' ? tipoPersonalizado.trim() : tipo;
    const fecha_hora = `${fecha}T${hora}:00Z`;

    try {
      const evento = await createEvent({
        nombre: nombre.trim(),
        tipo: tipoFinal,
        fecha_hora,
        cliente_contacto: clienteContacto.trim(),
        lugar: lugar.trim(),
      });
      setEventoId(evento.id);
      await guardarGestionesPendientes(evento.id);
    } catch (err) {
      setFormStatus('error');
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
        focusField(Object.keys(err.fieldErrors)[0] === 'fecha_hora' ? 'fecha' : Object.keys(err.fieldErrors)[0]);
      }
      setFormError(err.message || 'No pudimos guardar el evento, intenta de nuevo.');
    }
  }

  const eventoYaCreado = eventoId !== null;
  const enviando = formStatus === 'submitting';
  const totalGestiones = gestiones.length;
  const totalHoras = gestiones.reduce((sum, g) => sum + (Number(g.horas_estimadas) || 0), 0);

  return (
    <div className="flex flex-col gap-2 pb-16">
      <div className="mb-6">
        {/* tabIndex=-1: no entra en el orden de tab, solo recibe foco por programa */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={`${FONT_HEADLINE} text-2xl sm:text-3xl font-extrabold text-[#181b27] tracking-tight focus:outline-none`}
        >
          Crear nuevo evento
        </h1>
        <p className="text-sm sm:text-base text-[#49454f] mt-1 max-w-2xl">
          Registra los datos del evento y opcionalmente su plan logístico inicial.
        </p>
      </div>

      {formStatus === 'success' && (
        <p className="px-4 py-3 rounded-xl mb-4 font-medium bg-[#eaf7ee] text-[#1e5a34] border border-[#1e5a34]/30" role="status">
          Evento creado exitosamente. Te llevamos al evento…
        </p>
      )}
      {formError && (
        <p className="px-4 py-3 rounded-xl mb-4 font-medium bg-[#ffdad6]/50 text-[#8c0009] border border-[#ba1a1a]/30" role="alert">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna principal */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <fieldset disabled={eventoYaCreado || enviando} className={CARD}>
              <legend className="sr-only">Datos del evento</legend>
              <div className="flex items-center gap-3 pb-4 border-b border-[#ebedfe]">
                <div className={CARD_HEADER_ICON}>
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">celebration</span>
                </div>
                <div>
                  <h2 className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>Datos del evento</h2>
                  <p className="text-xs text-[#7a7580]">Información principal del evento</p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nombre" className={LABEL}>
                    Nombre del evento <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className={INPUT_WRAP}>
                    <span className={INPUT_ICON} aria-hidden="true">edit_calendar</span>
                    <input
                      id="nombre"
                      type="text"
                      className={INPUT}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      aria-invalid={Boolean(fieldErrors.nombre)}
                      aria-describedby={fieldErrors.nombre ? 'error-nombre' : undefined}
                    />
                  </div>
                  {fieldErrors.nombre && <p id="error-nombre" className={ERROR} role="alert">{fieldErrors.nombre[0]}</p>}
                </div>

                <fieldset className="flex flex-col gap-2">
                  <legend className={LABEL}>Tipo de evento <span className="text-[#ba1a1a]">*</span></legend>
                  <div
                    id="tipo"
                    tabIndex={-1}
                    className="flex flex-wrap gap-2 rounded-md focus:outline focus:outline-[3px] focus:outline-[#63518b] focus:outline-offset-2"
                    aria-describedby={fieldErrors.tipo ? 'error-tipo' : undefined}
                  >
                    {TIPOS_SUGERIDOS.map((op) => (
                      <button
                        key={op}
                        type="button"
                        aria-pressed={tipo === op}
                        className={`${PILL_BASE} ${tipo === op ? PILL_ACTIVE : PILL_INACTIVE}`}
                        onClick={() => setTipo(op)}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                  {tipo === 'Otro' && (
                    <input
                      type="text"
                      className={`${INPUT} pl-4`}
                      placeholder="Escribe el tipo de evento"
                      value={tipoPersonalizado}
                      onChange={(e) => setTipoPersonalizado(e.target.value)}
                      aria-label="Tipo de evento personalizado"
                    />
                  )}
                  {fieldErrors.tipo && <p id="error-tipo" className={ERROR} role="alert">{fieldErrors.tipo[0]}</p>}
                </fieldset>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fecha" className={LABEL}>Fecha del evento <span className="text-[#ba1a1a]">*</span></label>
                    <div className={INPUT_WRAP}>
                      <span className={INPUT_ICON} aria-hidden="true">calendar_month</span>
                      <input
                        id="fecha"
                        type="date"
                        className={INPUT}
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.fecha_hora)}
                        aria-describedby={fieldErrors.fecha_hora ? 'error-fecha-hora' : undefined}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="hora" className={LABEL}>Hora del evento <span className="text-[#ba1a1a]">*</span></label>
                    <div className={INPUT_WRAP}>
                      <span className={INPUT_ICON} aria-hidden="true">schedule</span>
                      <input
                        id="hora"
                        type="time"
                        className={INPUT}
                        value={hora}
                        onChange={(e) => setHora(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.fecha_hora)}
                        aria-describedby={fieldErrors.fecha_hora ? 'error-fecha-hora' : undefined}
                      />
                    </div>
                  </div>
                  {fieldErrors.fecha_hora && (
                    <p id="error-fecha-hora" className={`${ERROR} sm:col-span-2`} role="alert">{fieldErrors.fecha_hora[0]}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cliente_contacto" className={LABEL}>Contacto del cliente <span className="text-[#ba1a1a]">*</span></label>
                  <div className={INPUT_WRAP}>
                    <span className={INPUT_ICON} aria-hidden="true">person</span>
                    <input
                      id="cliente_contacto"
                      type="text"
                      className={INPUT}
                      value={clienteContacto}
                      onChange={(e) => setClienteContacto(e.target.value)}
                      aria-invalid={Boolean(fieldErrors.cliente_contacto)}
                      aria-describedby={fieldErrors.cliente_contacto ? 'error-cliente' : undefined}
                    />
                  </div>
                  {fieldErrors.cliente_contacto && <p id="error-cliente" className={ERROR} role="alert">{fieldErrors.cliente_contacto[0]}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lugar" className={LABEL}>Lugar <span className="text-[#ba1a1a]">*</span></label>
                  <div className={INPUT_WRAP}>
                    <span className={INPUT_ICON} aria-hidden="true">pin_drop</span>
                    <input
                      id="lugar"
                      type="text"
                      className={INPUT}
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                      aria-invalid={Boolean(fieldErrors.lugar)}
                      aria-describedby={fieldErrors.lugar ? 'error-lugar' : undefined}
                    />
                  </div>
                  {fieldErrors.lugar && <p id="error-lugar" className={ERROR} role="alert">{fieldErrors.lugar[0]}</p>}
                </div>
              </div>
            </fieldset>

            <fieldset disabled={enviando} className={CARD}>
              <legend className="sr-only">Plan logístico inicial</legend>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#ebedfe]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d2e4ff] flex items-center justify-center text-[#3c608b] flex-shrink-0">
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">checklist_rtl</span>
                  </div>
                  <div>
                    <h2 className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>Plan logístico inicial</h2>
                    <p className="text-xs text-[#7a7580]">Gestiones con su fecha y horas estimadas</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#d2e4ff] text-[#001c37] text-xs font-bold self-start sm:self-auto">
                  {totalHoras.toFixed(1)}h planificadas
                </span>
              </div>

              {gestiones.length === 0 && (
                <p className="text-[#49454f] italic">
                  Aún no tienes gestiones. Agrega la primera tarea logística (por ejemplo, reservar el salón o confirmar el catering).
                </p>
              )}

              <div className="flex flex-col gap-3">
                {gestiones.map((gestion, index) => (
                  <div className="p-4 rounded-xl border border-[#ebedfe] bg-[#faf8ff] flex flex-col gap-3" key={gestion.id}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#181b27]">
                      <span className="material-symbols-outlined text-[18px] text-[#63518b]" aria-hidden="true">task_alt</span>
                      Gestión {index + 1}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor={`gestion-titulo-${gestion.id}`} className={LABEL}>Título</label>
                      <input
                        id={`gestion-titulo-${gestion.id}`}
                        type="text"
                        className={`${INPUT} pl-4`}
                        placeholder="Ej: Reservar salón"
                        value={gestion.titulo}
                        disabled={gestion.status === 'saved' || gestion.status === 'saving'}
                        onChange={(e) => actualizarGestion(gestion.id, 'titulo', e.target.value)}
                        aria-invalid={gestion.errorField === 'titulo'}
                        aria-describedby={gestion.error ? `gestion-error-${gestion.id}` : undefined}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`gestion-fecha-${gestion.id}`} className={LABEL}>Fecha objetivo</label>
                        <input
                          id={`gestion-fecha-${gestion.id}`}
                          type="date"
                          className={`${INPUT} pl-4`}
                          value={gestion.fecha_objetivo}
                          disabled={gestion.status === 'saved' || gestion.status === 'saving'}
                          onChange={(e) => actualizarGestion(gestion.id, 'fecha_objetivo', e.target.value)}
                          aria-invalid={gestion.errorField === 'fecha'}
                          aria-describedby={gestion.error ? `gestion-error-${gestion.id}` : undefined}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`gestion-horas-${gestion.id}`} className={LABEL}>Horas estimadas</label>
                        <input
                          id={`gestion-horas-${gestion.id}`}
                          type="number"
                          min="0.5"
                          step="0.5"
                          className={`${INPUT} pl-4`}
                          value={gestion.horas_estimadas}
                          disabled={gestion.status === 'saved' || gestion.status === 'saving'}
                          onChange={(e) => actualizarGestion(gestion.id, 'horas_estimadas', e.target.value)}
                          aria-invalid={gestion.errorField === 'horas'}
                          aria-describedby={gestion.error ? `gestion-error-${gestion.id}` : undefined}
                        />
                      </div>
                    </div>

                    <div className="min-h-[1.25rem] text-sm" aria-live="polite">
                      {gestion.status === 'saving' && <span>Guardando…</span>}
                      {gestion.status === 'saved' && <span className="text-[#1e5a34] font-semibold">Gestión guardada</span>}
                      {gestion.error && (
                        <p id={`gestion-error-${gestion.id}`} className={ERROR} role="alert">{gestion.error}</p>
                      )}
                    </div>

                    {gestion.status !== 'saved' && (
                      <button type="button" className={`${BOTON_SECUNDARIO} self-start`} onClick={() => eliminarGestion(gestion.id)} disabled={enviando}>
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" className={`${BOTON_SECUNDARIO} self-start flex items-center gap-2`} onClick={agregarGestion} disabled={enviando}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add_circle</span>
                Agregar gestión
              </button>
            </fieldset>
          </div>

          {/* Columna lateral: resumen y acciones */}
          <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
            <div className={CARD}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#ebedfe]">
                <div className="w-8 h-8 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#63518b]">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">analytics</span>
                </div>
                <h3 className={`${FONT_HEADLINE} text-base font-bold text-[#181b27]`}>Resumen del plan</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#ebedfe] flex flex-col">
                  <span className="text-xs text-[#7a7580]">Gestiones</span>
                  <span className={`${FONT_HEADLINE} text-2xl font-extrabold text-[#181b27] mt-1`}>{totalGestiones}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#d2e4ff]/40 border border-[#d2e4ff] flex flex-col">
                  <span className="text-xs text-[#3c608b] font-medium">Horas estimadas</span>
                  <span className={`${FONT_HEADLINE} text-2xl font-extrabold text-[#3c608b] mt-1`}>{totalHoras.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className={CARD}>
              <button type="submit" className={BOTON_PRINCIPAL} disabled={enviando}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check</span>
                {enviando
                  ? 'Guardando…'
                  : eventoYaCreado
                    ? 'Reintentar guardar gestiones pendientes'
                    : 'Guardar evento'}
              </button>
              <button type="button" className={BOTON_SECUNDARIO} onClick={() => navigate(-1)} disabled={enviando}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}