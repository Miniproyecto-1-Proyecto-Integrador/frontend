// Microcopy del Sprint 4 (C4): confirmaciones, notas, estados y vacíos.
// Todos los textos están aquí para ajustarlos sin tocar los componentes.
// Criterio: claro, breve, orientado a la acción y sin jerga técnica.

export const MC = {
  estados: {
    pendiente: 'Pendiente',
    hecha: 'Hecha',
    pospuesta: 'Pospuesta',
  },

  acciones: {
    hecha: 'Hecha',
    posponer: 'Posponer',
    volverPendiente: 'Volver a pendiente',
    confirmarPosponer: 'Posponer gestión',
    cancelar: 'Cancelar',
    guardando: 'Guardando…',
  },

  nota: {
    prefijo: 'Nota',
    etiqueta: 'Nota (opcional)',
    placeholder: 'Ej. Esperando confirmación del salón',
    ayuda: 'Se mostrará en la tarjeta para que recuerdes por qué la pospusiste.',
  },

  exito: {
    hecha: (titulo) => `¡Listo! «${titulo}» quedó como hecha.`,
    pospuesta: (titulo, conNota) =>
      conNota
        ? `Pospusiste «${titulo}» y guardamos tu nota.`
        : `Pospusiste «${titulo}». Puedes retomarla cuando quieras.`,
    pendiente: (titulo) => `«${titulo}» volvió a tus pendientes.`,
  },

  error: {
    guardar: 'No pudimos guardar el cambio. Inténtalo de nuevo.',
    guardarConNota: 'No pudimos guardar el cambio, pero tu nota sigue aquí. Inténtalo de nuevo.',
  },

  progreso: {
    titulo: 'Progreso de preparación',
    cargando: 'Cargando progreso…',
    vacio: 'Sin gestiones asignadas todavía',
    conteo: (hechas, total) =>
      `${hechas} de ${total} ${total === 1 ? 'gestión hecha' : 'gestiones hechas'}`,
    error: 'No pudimos cargar el progreso de este evento.',
    reintentar: 'Reintentar',
    etiquetaBarra: (porcentaje) => `Progreso de preparación del evento: ${porcentaje}%`,
  },

  paginaProgreso: {
    titulo: 'Progreso',
    subtitulo: 'Así va la preparación de cada uno de tus eventos.',
    cargando: 'Cargando eventos…',
    vacio: 'Aún no tienes eventos creados.',
    crear: 'Crear evento',
    error: 'No pudimos cargar tus eventos.',
    reintentar: 'Reintentar',
  },

  hoy: {
    horasPendientes: (horas) => `${horas} h pendientes`,
  },
};