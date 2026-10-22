// Garabatos (doodles) decorativos en SVG, con colores suaves de la paleta.
// Todos son aria-hidden: no aportan información, solo dan vida a zonas vacías.

const MORADO = '#a58fd6';
const AZUL = '#9dbfe8';
const ROSA = '#f2b8d0';
const AMARILLO = '#f5d98a';

// Confeti, estrellas y ondas sueltas: para esquinas de cabeceras y tarjetas.
export function DoodleConfeti({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 120"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pointer-events-none select-none ${className}`}
    >
      <path d="M12 30c10-14 20 14 30 0s20 14 30 0" stroke={MORADO} />
      <path d="M118 96c9-12 18 12 27 0s18 12 27 0" stroke={AZUL} />
      <path d="M150 28l5 11 12 2-9 8 2 12-10-6-11 6 3-12-9-8 12-2z" stroke={AMARILLO} fill={AMARILLO} fillOpacity="0.35" />
      <path d="M40 78l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" stroke={ROSA} fill={ROSA} fillOpacity="0.35" />
      <circle cx="104" cy="22" r="5" stroke={ROSA} />
      <circle cx="82" cy="100" r="4" stroke={MORADO} />
      <circle cx="184" cy="64" r="4" stroke={AMARILLO} />
      <path d="M170 8l8 8M178 8l-8 8" stroke={AZUL} />
      <path d="M8 108l8 8M16 108l-8 8" stroke={AMARILLO} />
    </svg>
  );
}

// Calendario con una palomita: para estados vacíos de eventos y gestiones.
export function DoodleCalendario({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 100"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pointer-events-none select-none ${className}`}
    >
      <rect x="24" y="22" width="68" height="60" rx="10" stroke={MORADO} fill="#f2f3ff" />
      <path d="M24 40h68" stroke={MORADO} />
      <path d="M42 14v14M74 14v14" stroke={MORADO} />
      <path d="M44 62l9 9 18-19" stroke={AZUL} />
      <path d="M100 18l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" stroke={AMARILLO} fill={AMARILLO} fillOpacity="0.4" />
      <circle cx="12" cy="70" r="4" stroke={ROSA} />
      <path d="M104 74c6-8 12 8 18 0" stroke={ROSA} />
    </svg>
  );
}

// Lista de tareas con lápiz: para el plan logístico vacío.
export function DoodleLista({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 100"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pointer-events-none select-none ${className}`}
    >
      <rect x="22" y="14" width="64" height="76" rx="10" stroke={AZUL} fill="#f2f3ff" />
      <path d="M36 36l4 4 8-8M36 56l4 4 8-8" stroke={MORADO} />
      <path d="M56 36h18M56 56h18M36 76h38" stroke={MORADO} />
      <path d="M92 60l16-16 8 8-16 16-10 2z" stroke={AMARILLO} fill={AMARILLO} fillOpacity="0.4" />
      <circle cx="104" cy="14" r="4" stroke={ROSA} />
    </svg>
  );
}
