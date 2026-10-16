// Cálculos de carga diaria que se usan en el aviso de sobrecarga.
// Son solo para AVISAR a tiempo: la decisión final siempre la toma el backend
// (si algo no cuadra, el backend responde 409 y se muestra el flujo de conflicto).

export const redondear = (n) => Math.round(n * 100) / 100;

// Redondea hacia abajo para no proponer unas horas que otra vez excedan el límite.
export const redondearAbajo = (n) => Math.floor(n * 100) / 100;

export function formatFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Suma días a una fecha 'YYYY-MM-DD' sin depender de la zona horaria.
export function sumarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

// Gestiones pendientes de hoy en adelante, a partir de la respuesta de /hoy.
// Las hechas no cuentan; las vencidas (fecha pasada) tampoco: ya no se pueden planificar.
export function gestionesVigentes(hoyData) {
  const g = hoyData?.grupos ?? {};
  return [...(g.hoy ?? []), ...(g.proximas ?? [])].filter((x) => x.estado === 'pendiente');
}

// { 'YYYY-MM-DD': { horas, eventos: Map(id -> nombre) } }
export function cargaPorDia(gestiones) {
  const mapa = {};
  for (const g of gestiones) {
    const horas = Number(g.horas_estimadas) || 0;
    if (!g.fecha_objetivo || horas <= 0) continue;
    const dia = (mapa[g.fecha_objetivo] ??= { horas: 0, eventos: new Map() });
    dia.horas += horas;
    if (g.evento_id != null) dia.eventos.set(g.evento_id, g.evento_nombre);
  }
  return mapa;
}

// Días cuya carga supera el límite, ordenados por fecha.
export function diasSobrecargados(carga, limite) {
  return Object.entries(carga)
    .filter(([, d]) => redondear(d.horas) > limite)
    .map(([fecha, d]) => ({
      fecha,
      horas: redondear(d.horas),
      exceso: redondear(d.horas - limite),
      eventos: [...d.eventos].map(([id, nombre]) => ({ id, nombre })),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Primer día después de `desde` (y hasta la fecha del evento) donde caben `horas`.
export function proximaFechaLibre({ desde, hasta, minimo, horas, limite, carga }) {
  if (!desde || !hasta || !(horas > 0) || horas > limite) return null;
  for (let i = 1; i <= 400; i++) {
    const dia = sumarDias(desde, i);
    if (dia > hasta) return null;
    if (minimo && dia < minimo) continue;
    if (redondear((carga[dia]?.horas ?? 0) + horas) <= limite) return dia;
  }
  return null;
}