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

  // Sobrecarga diaria: aviso en Configuración y en /crear.
  sobrecarga: {
    // Configuración
    configBloqueado: (limite, n) =>
      `No puedes bajar el límite a ${limite} h todavía: ${n} ${n === 1 ? 'día quedaría' : 'días quedarían'} en sobrecarga`,
    configPieBloqueado:
      'Primero mueve esas gestiones a otro día o reduce sus horas desde cada evento. Después vuelve a cambiar el límite.',
    configErrorBloqueo:
      'No guardamos el cambio. Primero ajusta los días en sobrecarga que aparecen abajo.',
    configNoVerificado:
      'No pudimos comprobar tus días planificados, así que no cambiamos el límite. Inténtalo de nuevo.',
    configSigue: (limite, n) =>
      `Con ${limite} h por día, ${n} ${n === 1 ? 'día seguiría' : 'días seguirían'} por encima`,
    configPieSigue:
      'Puedes guardar: este cambio no agrega conflictos nuevos. Resuelve esos días desde cada evento.',
    configActivo: (limite, n) =>
      `Tu límite de ${limite} h ya está activo, pero ${n} ${n === 1 ? 'día lo supera' : 'días lo superan'}`,
    configPieActivo:
      'Resuélvelo desde cada evento: mueve la gestión a otro día o reduce sus horas.',
    dia: (fecha, horas, exceso) => `${fecha}: ${horas} h planificadas (${exceso} h de más)`,
    masDias: (n) => `y ${n} ${n === 1 ? 'día más' : 'días más'}`,
    revisando: 'Revisando tus días…',
    sinRevision:
      'No pudimos revisar tus días planificados. Si bajas el límite, volveremos a comprobarlo al guardar.',

    // /crear: aviso mientras se escribe
    preventivo: (horasTotal, limite) =>
      `Ese día quedarías con ${horasTotal} h planificadas (tu límite es ${limite} h).`,
    preventivoAyuda: 'Ajusta la fecha o las horas antes de guardar para evitar que se rechace.',
    reducirA: (horas) => `Reducir a ${horas} h`,
    moverA: (fecha) => `Mover al ${fecha}`,
    resumenCrear: (n) =>
      `${n} ${n === 1 ? 'gestión supera' : 'gestiones superan'} tu límite diario. Ajústalas antes de guardar para evitar que se rechacen.`,

    // /crear: conflicto al guardar (mismas opciones que en Mis eventos)
    conflictoTitulo: 'Hay un conflicto de planificación',
    conflictoTexto: 'Esta gestión haría que el tiempo planificado para el día supere tu límite diario.',
    conflictoDisponibles: (h) => `Tienes ${h} h disponibles dentro de tu límite diario.`,
    reducirYGuardar: (h) => `Reducir a ${h} h y guardar`,
    moverProxima: 'Mover a la próxima fecha disponible',
    buscandoFecha: 'Buscando fecha…',
    fechaPropuesta: 'Próxima fecha disponible:',
    revisaFecha: 'Revisa la fecha antes de confirmar el cambio.',
    confirmarFecha: 'Confirmar fecha y guardar',
    volverEditar: 'Volver a editar',
    sinFecha: 'No encontramos una fecha disponible antes del evento.',
    errorFecha: 'No pudimos buscar una fecha disponible.',
    soloConflictos:
      'El evento se creó, pero algunas gestiones superan tu límite diario. Elige cómo resolverlas abajo.',
  },
};