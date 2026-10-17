import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BOTON_PRINCIPAL, BOTON_SECUNDARIO,
  CARD, CARD_HEADER_ICON,
  ERROR,
  FONT_HEADLINE,
  INPUT,
  INPUT_ICON,
  INPUT_WRAP,
  InputIcono, LABEL,
  PILL_ACTIVE,
  PILL_BASE,
  PILL_INACTIVE,
} from './components/ui';
import { AvisoSobrecarga, ConflictoSobrecarga } from './components/ConflictoSobrecarga';
import { esFalloDeRed, MENSAJE_ERROR_RED } from './helpers/errors';
import { MC } from './helpers/microcopy';
import { useTituloPagina } from './helpers/useTituloPagina';
import {
  cargaPorDia,
  fechaLibreCercana,
  gestionesVigentes,
  redondear,
  redondearAbajo,
} from './helpers/sobrecarga';
import { createEvent, createSubtask, getHoy, getLimiteDiario } from './services/events';

// El backend acepta "tipo" como texto libre; estas son solo sugerencias
// visuales (pills). "Otro" abre un campo de texto normal.
const TIPOS_SUGERIDOS = ['Boda', 'Social', 'Corporativo', 'Cumpleaños', 'Otro'];

function focusField(id) {
  document.getElementById(id)?.focus();
}

function nuevaGestionVacia() {
  return {
    id: crypto.randomUUID(),
    titulo: '', fecha_objetivo: '', horas_estimadas: '', status: 'pending', error: null, errorField: null, conflicto: null,
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
  useTituloPagina('Crear evento');
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

  // Datos para avisar de sobrecarga MIENTRAS se escriben las gestiones.
  // Si no cargan, el formulario funciona igual (el backend sigue validando al guardar).
  const [limite, setLimite] = useState(null);
  const [hoyData, setHoyData] = useState(null);

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
    let activo = true;
    Promise.allSettled([getLimiteDiario(), getHoy({ estado: 'pendiente' })]).then(([l, h]) => {
      if (!activo) return;
      if (l.status === 'fulfilled') setLimite(Number(l.value.horas));
      if (h.status === 'fulfilled') setHoyData(h.value);
    });
    return () => { activo = false; };
  }, []);

  // Si se resolvió el último conflicto y todo quedó guardado, se completa el flujo.
  useEffect(() => {
    if (!eventoId || formStatus !== 'error') return;
    if (gestiones.length > 0 && gestiones.every((g) => g.status === 'saved')) {
      setFormStatus('success');
      setFormError(null);
    }
  }, [gestiones, eventoId, formStatus]);

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
          ? { ...g, [campo]: valor, error: null, errorField: null, conflicto: null, status: g.status === 'saved' ? g.status : 'pending' }
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

      actualizadas[i] = { ...actualizadas[i], status: 'saving', error: null, errorField: null, conflicto: null };
      setGestiones([...actualizadas]);

      try {
        await createSubtask(idEvento, {
          titulo: actualizadas[i].titulo.trim(),
          fecha_objetivo: actualizadas[i].fecha_objetivo,
          horas_estimadas: actualizadas[i].horas_estimadas,
        });
        actualizadas[i] = { ...actualizadas[i], status: 'saved', error: null, errorField: null, conflicto: null };
      } catch (err) {
        huboError = true;
        // Sobrecarga diaria: no es un error de campo, se ofrecen alternativas para resolverla.
        if (err.status === 409 && err.conflicto) {
          actualizadas[i] = { ...actualizadas[i], status: 'error', error: null, errorField: null, conflicto: err.conflicto };
          setGestiones([...actualizadas]);
          continue;
        }
        let mensaje = 'No pudimos guardar esta gestión.';
        let errorField = null;
        if (esFalloDeRed(err)) {
          mensaje = MENSAJE_ERROR_RED;
        } else if (err.fieldErrors?.titulo) { mensaje = err.fieldErrors.titulo[0]; errorField = 'titulo'; }
        else if (err.fieldErrors?.horas_estimadas) { mensaje = err.fieldErrors.horas_estimadas[0]; errorField = 'horas'; }
        else if (err.fieldErrors?.fecha_objetivo) { mensaje = err.fieldErrors.fecha_objetivo[0]; errorField = 'fecha'; }
        else if (err.message) mensaje = err.message;
        actualizadas[i] = { ...actualizadas[i], status: 'error', error: mensaje, errorField };
      }
      setGestiones([...actualizadas]);
    }

    if (huboError) {
      setFormStatus('error');
      const conError = actualizadas.filter((g) => g.status === 'error');
      setFormError(
        conError.every((g) => g.conflicto)
          ? MC.sobrecarga.soloConflictos
          : 'El evento se creó, pero algunas gestiones no se pudieron guardar. Revisa los mensajes abajo e inténtalo de nuevo.'
      );
      const primeraConError = conError[0];
      if (primeraConError?.errorField) {
        focusField(`gestion-${primeraConError.errorField}-${primeraConError.id}`);
      }
    } else {
      setFormStatus('success');
      setFormError(null);
    }
  }

  // Guarda UNA gestión que quedó en conflicto, con las horas o la fecha elegidas.
  async function resolverConflicto(gestionId, cambios) {
    const actual = gestiones.find((g) => g.id === gestionId);
    if (!actual || !eventoId) return;
    const nueva = { ...actual, ...cambios };
    const poner = (extra) =>
      setGestiones((prev) => prev.map((g) => (g.id === gestionId ? { ...nueva, errorField: null, ...extra } : g)));

    poner({ status: 'saving', error: null, conflicto: null });
    try {
      await createSubtask(eventoId, {
        titulo: nueva.titulo.trim(),
        fecha_objetivo: nueva.fecha_objetivo,
        horas_estimadas: nueva.horas_estimadas,
      });
      poner({ status: 'saved', error: null, conflicto: null });
    } catch (err) {
      if (err.status === 409 && err.conflicto) {
        poner({ status: 'error', error: null, conflicto: err.conflicto });
      } else {
        poner({
          status: 'error',
          conflicto: null,
          error: esFalloDeRed(err)
            ? MENSAJE_ERROR_RED
            : err.fieldErrors?.horas_estimadas?.[0] || err.fieldErrors?.fecha_objetivo?.[0] || err.message || 'No pudimos guardar esta gestión.',
        });
      }
    }
  }

  function volverAEditar(gestionId) {
    setGestiones((prev) =>
      prev.map((g) => (g.id === gestionId ? { ...g, conflicto: null, error: null, status: 'pending' } : g))
    );
    setTimeout(() => focusField(`gestion-fecha-${gestionId}`), 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Si alguna gestión superaría el límite diario, no se guarda nada todavía:
    // evita crear el evento a medias con unas gestiones guardadas y otras no.
    if (totalAvisos > 0) {
      setFormError(MC.sobrecarga.bloqueoCrear);
      const primera = gestiones.find((g) => avisos[g.id]);
      if (primera) focusField(`gestion-fecha-${primera.id}`);
      return;
    }

    if (eventoId) {
      await guardarGestionesPendientes(eventoId);
      return;
    }

    setFormStatus('submitting');
    setFormError(null);
    setFieldErrors({});

    const tipoFinal = tipo === 'Otro' ? tipoPersonalizado.trim() : tipo;
    const fecha_hora = `${fecha}T${hora}:00`;

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
      setFormError(esFalloDeRed(err) ? MENSAJE_ERROR_RED : (err.message || 'No pudimos guardar el evento, intenta de nuevo.'));
    }
  }

  const eventoYaCreado = eventoId !== null;
  const enviando = formStatus === 'submitting';
  const totalGestiones = gestiones.length;
  const totalHoras = gestiones.reduce((sum, g) => sum + (Number(g.horas_estimadas) || 0), 0);

  // Carga por día = lo ya planificado en otros eventos + los borradores de esta pantalla.
  const cargaTotal = useMemo(() => {
    if (!hoyData) return {};
    const existente = cargaPorDia(gestionesVigentes(hoyData));
    const borradores = cargaPorDia(gestiones);
    const total = {};
    for (const dia of new Set([...Object.keys(existente), ...Object.keys(borradores)])) {
      total[dia] = { horas: (existente[dia]?.horas ?? 0) + (borradores[dia]?.horas ?? 0) };
    }
    return total;
  }, [gestiones, hoyData]);

  // Aviso en vivo. Se recorre en el mismo orden en que se guardan las gestiones: la que hace
  // pasar el límite es la que el backend rechazaría, y esa es la que se marca.
  const avisos = useMemo(() => {
    if (limite === null || !hoyData) return {};
    const existente = cargaPorDia(gestionesVigentes(hoyData));
    const acumulado = {};
    const resultado = {};
    for (const g of gestiones) {
      const horas = Number(g.horas_estimadas);
      if (!g.fecha_objetivo || !(horas > 0)) continue;
      const antes = (existente[g.fecha_objetivo]?.horas ?? 0) + (acumulado[g.fecha_objetivo] ?? 0);
      acumulado[g.fecha_objetivo] = (acumulado[g.fecha_objetivo] ?? 0) + horas;
      const despues = redondear(antes + horas);
      if (g.status === 'saved' || g.conflicto || despues <= limite) continue;
      resultado[g.id] = {
        horasTotal: despues,
        limite,
        disponibles: Math.max(0, redondearAbajo(limite - antes)),
        sugerencia: fechaLibreCercana({
          desde: g.fecha_objetivo,
          hasta: fecha,
          minimo: hoyData.hoy,
          horas,
          limite,
          carga: cargaTotal,
        }),
      };
    }
    return resultado;
  }, [gestiones, limite, hoyData, fecha, cargaTotal]);
  const totalAvisos = Object.keys(avisos).length;

  // El mensaje de bloqueo desaparece solo cuando ya no queda ninguna gestión en sobrecarga.
  useEffect(() => {
    if (totalAvisos === 0 && formError === MC.sobrecarga.bloqueoCrear) setFormError(null);
  }, [totalAvisos, formError]);

  return (
    <div className="flex flex-col gap-2 pb-16">
      {/* Cabecera con un leve acento decorativo detrás del título — el único
          "momento" visual de la página; el resto se mantiene tranquilo. */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-gradient-to-br from-[#d2e4ff] via-[#e4d9ff] to-transparent opacity-60 blur-2xl" />
          <span className="absolute -right-2 -top-4 material-symbols-outlined text-[120px] text-[#63518b]/[0.06] select-none">
            celebration
          </span>
        </div>

        {/* tabIndex=-1: no entra en el orden de tab, solo recibe foco por programa */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={`${FONT_HEADLINE} relative text-2xl sm:text-3xl font-extrabold text-[#181b27] tracking-tight focus:outline-none`}
        >
          Crear nuevo evento
        </h1>
        <p className="relative text-sm sm:text-base text-[#49454f] mt-1 max-w-2xl">
          Registra los datos del evento y opcionalmente su plan logístico inicial.
        </p>
      </div>

      {formStatus === 'success' && (
        <p className="px-4 py-3 rounded-xl mb-4 font-medium bg-[#eaf7ee] text-[#1e5a34] border border-[#1e5a34]/30 flex items-center gap-2" role="status">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">task_alt</span>
          Evento creado exitosamente. Te llevamos al evento…
        </p>
      )}
      {formError && (
        <p className="px-4 py-3 rounded-xl mb-4 font-medium bg-[#ffdad6]/50 text-[#8c0009] border border-[#ba1a1a]/30 flex items-center gap-2" role="alert">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna principal */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <fieldset disabled={eventoYaCreado || enviando} className={`${CARD} shadow-sm`}>
              <legend className="sr-only">Datos del evento</legend>
              <div className="flex items-center gap-3 pb-4 border-b border-[#ebedfe]">
                <div className={`${CARD_HEADER_ICON} shadow-sm`}>
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">celebration</span>
                </div>
                <div>
                  <h2 className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>Datos del evento</h2>
                  <p className="text-xs text-[#625d66]">Información principal del evento. Los campos marcados con asterisco (*) son obligatorios.</p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nombre" className={LABEL}>
                    Nombre del evento <span className="text-[#ba1a1a]" aria-hidden="true">*</span>
                  </label>
                  <div className={INPUT_WRAP}>
                    <span className={INPUT_ICON} aria-hidden="true">edit_calendar</span>
                    <input
                      id="nombre"
                      aria-required="true"
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
                  <legend className={LABEL}>Tipo de evento <span className="text-[#ba1a1a]" aria-hidden="true">*</span><span className="sr-only"> (obligatorio)</span></legend>
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
                        className={`${PILL_BASE} ${tipo === op ? PILL_ACTIVE : PILL_INACTIVE} transition-colors`}
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
                    <label htmlFor="fecha" className={LABEL}>Fecha del evento <span className="text-[#ba1a1a]" aria-hidden="true">*</span></label>
                    <div className={INPUT_WRAP}>
                      <span className={INPUT_ICON} aria-hidden="true">calendar_month</span>
                      <input
                        id="fecha"
                        aria-required="true"
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
                    <label htmlFor="hora" className={LABEL}>Hora del evento <span className="text-[#ba1a1a]" aria-hidden="true">*</span></label>
                    <div className={INPUT_WRAP}>
                      <span className={INPUT_ICON} aria-hidden="true">schedule</span>
                      <input
                        id="hora"
                        aria-required="true"
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
                  <label htmlFor="cliente_contacto" className={LABEL}>Contacto del cliente <span className="text-[#ba1a1a]" aria-hidden="true">*</span></label>
                  <div className={INPUT_WRAP}>
                    <span className={INPUT_ICON} aria-hidden="true">person</span>
                    <input
                      id="cliente_contacto"
                      aria-required="true"
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
                  <label htmlFor="lugar" className={LABEL}>Lugar <span className="text-[#ba1a1a]" aria-hidden="true">*</span></label>
                  <div className={INPUT_WRAP}>
                    <span className={INPUT_ICON} aria-hidden="true">pin_drop</span>
                    <input
                      id="lugar"
                      aria-required="true"
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

            <fieldset disabled={enviando} className={`${CARD} shadow-sm`}>
              <legend className="sr-only">Plan logístico inicial</legend>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#ebedfe]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d2e4ff] to-[#e8f0ff] flex items-center justify-center text-[#3c608b] flex-shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">checklist_rtl</span>
                  </div>
                  <div>
                    <h2 className={`${FONT_HEADLINE} text-lg font-bold text-[#181b27]`}>Plan logístico inicial</h2>
                    <p className="text-xs text-[#625d66]">Gestiones con su fecha y horas estimadas</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#d2e4ff] text-[#001c37] text-xs font-bold self-start sm:self-auto">
                  {totalHoras.toFixed(1)}h planificadas
                </span>
              </div>

              {gestiones.length === 0 && (
                <div className="flex flex-col items-center text-center gap-2 py-4">
                  <span className="material-symbols-outlined text-[26px] text-[#625d66]" aria-hidden="true">playlist_add</span>
                  <p className="text-[#49454f] italic">
                    Aún no tienes gestiones. Agrega la primera tarea logística (por ejemplo, reservar el salón o confirmar el catering).
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {gestiones.map((gestion, index) => (
                  <div className="p-4 rounded-xl border border-[#ebedfe] bg-[#faf8ff] flex flex-col gap-3" key={gestion.id}>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-[#181b27]">
                      <span className="material-symbols-outlined text-[18px] text-[#63518b]" aria-hidden="true">task_alt</span>
                      Gestión {index + 1}
                    </h3>

                                        <div className="flex flex-col gap-1">
                      <label htmlFor={`gestion-titulo-${gestion.id}`} className={LABEL}>Título</label>
                      <InputIcono
                        icon="edit_calendar"
                        id={`gestion-titulo-${gestion.id}`}
                        type="text"
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
                        <InputIcono
                          icon="calendar_month"
                          id={`gestion-fecha-${gestion.id}`}
                          type="date"
                          value={gestion.fecha_objetivo}
                          disabled={gestion.status === 'saved' || gestion.status === 'saving'}
                          onChange={(e) => actualizarGestion(gestion.id, 'fecha_objetivo', e.target.value)}
                          aria-invalid={gestion.errorField === 'fecha'}
                          aria-describedby={gestion.error ? `gestion-error-${gestion.id}` : undefined}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`gestion-horas-${gestion.id}`} className={LABEL}>Horas estimadas</label>
                        <InputIcono
                          icon="schedule"
                          id={`gestion-horas-${gestion.id}`}
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={gestion.horas_estimadas}
                          disabled={gestion.status === 'saved' || gestion.status === 'saving'}
                          onChange={(e) => actualizarGestion(gestion.id, 'horas_estimadas', e.target.value)}
                          aria-invalid={gestion.errorField === 'horas'}
                          aria-describedby={gestion.error ? `gestion-error-${gestion.id}` : undefined}
                        />
                      </div>
                    </div>

                    {avisos[gestion.id] && (
                      <AvisoSobrecarga
                        aviso={avisos[gestion.id]}
                        onReducir={() => actualizarGestion(gestion.id, 'horas_estimadas', String(avisos[gestion.id].disponibles))}
                        onMover={() => actualizarGestion(gestion.id, 'fecha_objetivo', avisos[gestion.id].sugerencia)}
                      />
                    )}

                    {gestion.conflicto && (
                      <ConflictoSobrecarga
                        conflicto={gestion.conflicto}
                        gestion={gestion}
                        onReducir={(horas) => resolverConflicto(gestion.id, { horas_estimadas: horas })}
                        onVolver={() => volverAEditar(gestion.id)}
                      />
                    )}

                    <div className="min-h-[1.25rem] text-sm" aria-live="polite">
                      {gestion.status === 'saving' && (
                        <span className="inline-flex items-center gap-1.5 text-[#63518b]">
                          <span className="material-symbols-outlined text-[16px] animate-spin" aria-hidden="true">progress_activity</span>
                          Guardando…
                        </span>
                      )}
                      {gestion.status === 'saved' && (
                        <span className="inline-flex items-center gap-1.5 text-[#1e5a34] font-semibold">
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check_circle</span>
                          Gestión guardada
                        </span>
                      )}
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
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
            <div className={`${CARD} shadow-sm`}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#ebedfe]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f2f3ff] to-[#e4d9ff] flex items-center justify-center text-[#63518b]">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">analytics</span>
                </div>
                <h2 className={`${FONT_HEADLINE} text-base font-bold text-[#181b27]`}>Resumen del plan</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#ebedfe] flex flex-col">
                  <span className="text-xs text-[#625d66]">Gestiones</span>
                  <span className={`${FONT_HEADLINE} text-2xl font-extrabold text-[#181b27] mt-1`}>{totalGestiones}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#d2e4ff]/40 border border-[#d2e4ff] flex flex-col">
                  <span className="text-xs text-[#3c608b] font-medium">Horas estimadas</span>
                  <span className={`${FONT_HEADLINE} text-2xl font-extrabold text-[#3c608b] mt-1`}>{totalHoras.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className={`${CARD} shadow-sm`}>
              {totalAvisos > 0 && (
                <p role="status" className="flex items-start gap-2 rounded-xl border border-[#6b4a00]/25 bg-[#fff4d6] p-3 text-xs font-semibold text-[#6b4a00]">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">warning</span>
                  {MC.sobrecarga.resumenCrear(totalAvisos)}
                </p>
              )}
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