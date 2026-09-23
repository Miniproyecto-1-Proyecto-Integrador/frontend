// Estilos compartidos, basados en la paleta y tipografía del mockup
// (Material 3 + Inter / Plus Jakarta Sans + Material Symbols Outlined).
// Todo en clases de Tailwind con valores arbitrarios: no requiere tocar
// tailwind.config.js, solo que Tailwind escanee este archivo (ya debería,
// si está dentro de src/).

export const FONT_HEADLINE = "font-['Plus_Jakarta_Sans']";

export const CARD =
  'bg-white rounded-2xl p-6 sm:p-8 border border-[#e5e7f8] shadow-[0_2px_8px_-2px_rgba(88,124,168,0.05)] flex flex-col gap-6';

export const CARD_HEADER_ICON =
  'w-10 h-10 rounded-xl bg-[#eaddff] flex items-center justify-center text-[#63518b] flex-shrink-0';

export const INPUT_WRAP = 'relative flex items-center';

export const INPUT_ICON =
  'material-symbols-outlined absolute left-3.5 text-[#7a7580] text-[20px] pointer-events-none';

export const INPUT =
  'w-full pl-11 pr-4 py-2.5 rounded-xl border border-[#e5e7f8] bg-white text-[#181b27] text-sm ' +
  'focus:border-[#63518b] focus:ring-2 focus:ring-[#63518b]/20 outline-none transition-all ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2 ' +
  'aria-invalid:border-[#ba1a1a] disabled:opacity-60 disabled:cursor-not-allowed';

export const LABEL = 'text-sm font-semibold text-[#181b27] mb-1.5 flex items-center gap-1';

export const ERROR = 'text-[#ba1a1a] text-xs mt-1.5';

export const BOTON_PRINCIPAL =
  'py-3 px-5 rounded-xl bg-[#63518b] hover:bg-[#524177] text-white font-bold text-sm shadow-md shadow-[#63518b]/20 ' +
  'flex items-center justify-center gap-2 transition-all active:scale-[0.98] ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#3d3163] focus-visible:outline-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100';

export const BOTON_SECUNDARIO =
  'py-2.5 px-5 rounded-xl bg-[#f2f3ff] hover:bg-[#ebedfe] text-[#181b27] font-semibold text-sm border border-[#e5e7f8] ' +
  'transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

export const BOTON_PELIGRO =
  'py-2.5 px-5 rounded-xl bg-white hover:bg-[#ffdad6]/40 text-[#ba1a1a] font-semibold text-sm border border-[#ba1a1a]/40 ' +
  'transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#ba1a1a] focus-visible:outline-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

export const PILL_BASE =
  'px-4 py-2 rounded-xl text-xs font-semibold border transition-all ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#63518b] focus-visible:outline-offset-2';

export const PILL_ACTIVE = 'bg-[#63518b] text-white border-[#63518b] shadow-sm';
export const PILL_INACTIVE =
  'border-[#e5e7f8] bg-[#f2f3ff] text-[#49454f] hover:bg-[#ebedfe] hover:text-[#181b27]';

export function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}