import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
    BOTON_PRINCIPAL,
    CARD_HEADER_ICON,
    FONT_HEADLINE,
    INPUT,
    INPUT_ICON,
    INPUT_WRAP,
    LABEL,
} from './components/ui';
import { useAuth } from './context/AuthContext';
import { esFalloDeRed, MENSAJE_ERROR_RED } from './helpers/errors';

// Puntos del panel morado (solo decorativo, visible desde lg).
const BENEFICIOS = [
  { icon: 'celebration', texto: 'Crea y organiza tus eventos en un solo lugar' },
  { icon: 'checklist', texto: 'Planifica las gestiones logísticas de cada uno' },
  { icon: 'today', texto: 'Ten claro qué hacer primero cada día' },
];

export default function Login() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.from?.pathname || '/crear';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const headingRef = useRef(null);
  const usernameRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (status === 'authed') return <Navigate to={destino} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(esFalloDeRed(err) ? MENSAJE_ERROR_RED : err.message);
      usernameRef.current?.focus();
    } finally {
      setEnviando(false);
    }
  }

  const describedBy = error ? 'login-error' : undefined;

  return (
    // Un tercio para el panel morado y dos tercios para el formulario.
    <div className="min-h-screen bg-[#faf8ff] text-[#181b27] lg:grid lg:grid-cols-[1fr_2fr]">
      {/* Panel morado: solo desktop y solo decorativo, por eso aria-hidden:
          el lector de pantalla lo salta y va directo al formulario. */}
      <aside
        aria-hidden="true"
        className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#3d3163] via-[#524177] to-[#63518b] p-10 text-white"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#eaddff]/20 blur-3xl" />
          <div className="absolute bottom-0 -left-16 h-72 w-72 rounded-full bg-[#d2e4ff]/15 blur-3xl" />
          <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-[200px] text-white/[0.06] select-none">
            celebration
          </span>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <span className="material-symbols-outlined text-[24px]">auto_schedule</span>
          </div>
          <span className={`${FONT_HEADLINE} text-xl font-bold tracking-tight`}>Planify</span>
        </div>

        <div className="relative flex flex-col gap-8">
          <p className={`${FONT_HEADLINE} text-3xl font-extrabold leading-tight tracking-tight`}>
            Tus eventos, <br /> bajo control.
          </p>
          <ul className="flex flex-col gap-4">
            {BENEFICIOS.map((b) => (
              <li key={b.icon} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <span className="material-symbols-outlined text-[20px]">{b.icon}</span>
                </span>
                {b.texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">Organizador de eventos</p>
      </aside>

      {/* Columna del formulario, con manchas de color suaves detrás */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-[#d2e4ff] via-[#e4d9ff] to-transparent opacity-70 blur-2xl" />
          <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-gradient-to-tr from-[#eaddff] to-transparent opacity-70 blur-2xl lg:hidden" />
        </div>

        <main className="relative w-full max-w-md">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-[#e5e7f8] bg-white p-6 pt-8 shadow-[0_8px_30px_-8px_rgba(99,81,139,0.25)] sm:p-8 sm:pt-10"
          >
            {/* Línea morada superior */}
            <div
              className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#3d3163] via-[#63518b] to-[#a58fd6]"
              aria-hidden="true"
            />

            <div className="flex items-center gap-3">
              <div className={CARD_HEADER_ICON}>
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">auto_schedule</span>
              </div>
              <div className="flex flex-col">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={`${FONT_HEADLINE} text-2xl font-extrabold tracking-tight focus:outline-none`}
                >
                  Iniciar sesión
                </h1>
                <p className="text-sm text-[#49454f]">Ingresa a Planify con tu correo o usuario.</p>
              </div>
            </div>

            {error && (
              <div
                id="login-error"
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="login-username" className={LABEL}>Correo o usuario</label>
              <div className={INPUT_WRAP}>
                <span className={INPUT_ICON} aria-hidden="true">person</span>
                <input
                  id="login-username"
                  ref={usernameRef}
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={INPUT}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={describedBy}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className={LABEL}>Contraseña</label>
              <div className={INPUT_WRAP}>
                <span className={INPUT_ICON} aria-hidden="true">lock</span>
                <input
                  id="login-password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT} pr-12!`}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={describedBy}
                  required
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verPassword}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-[#49454f] transition-colors hover:bg-[#f2f3ff] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#63518b]"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {verPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={BOTON_PRINCIPAL}
              disabled={enviando || !username.trim() || !password}
            >
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}