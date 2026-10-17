import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  BOTON_PRINCIPAL,
  CARD_HEADER_ICON,
  ERROR,
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

// Orden en el que se enfoca el primer campo con error.
const CAMPOS = ['username', 'email', 'password'];

export default function Register() {
  const { status, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.from?.pathname || '/hoy';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [cuentaCreada, setCuentaCreada] = useState(false);

  const headingRef = useRef(null);

  useEffect(() => {
    document.title = 'Crear cuenta · Planify';
    headingRef.current?.focus();
  }, []);

  if (status === 'authed') return <Navigate to={destino} replace />;

  function limpiarCampo(campo) {
    setFieldErrors((prev) => {
      if (!prev[campo]) return prev;
      const copia = { ...prev };
      delete copia[campo];
      return copia;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setFieldErrors({});
    setCuentaCreada(false);
    try {
      // Toda la validación la hace el backend; aquí solo se muestran sus mensajes.
      await register({ username: username.trim(), email: email.trim(), password });
      navigate(destino, { replace: true });
    } catch (err) {
      if (err.registroCreado) {
        // La cuenta sí se creó; solo falló el inicio de sesión automático.
        setCuentaCreada(true);
      } else if (esFalloDeRed(err)) {
        setError(MENSAJE_ERROR_RED);
      } else {
        const errores = err.fieldErrors || {};
        const campoConError = CAMPOS.find((c) => errores[c]);
        if (campoConError) {
          setFieldErrors(errores);
          document.getElementById(`reg-${campoConError}`)?.focus();
        } else {
          setError(err.message);
        }
      }
    } finally {
      setEnviando(false);
    }
  }

  // aria-describedby: primero la ayuda del campo y, si hay, su error.
  function describedBy(campo, conAyuda) {
    const ids = [];
    if (conAyuda) ids.push(`reg-ayuda-${campo}`);
    if (fieldErrors[campo]) ids.push(`reg-error-${campo}`);
    return ids.length ? ids.join(' ') : undefined;
  }

  return (
    <div className="min-h-dvh bg-[#faf8ff] text-[#181b27] lg:grid lg:grid-cols-[1fr_2fr]">
      {/* Panel morado: solo desktop y decorativo; el lector de pantalla lo salta. */}
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
            Empieza a <br /> organizar.
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

      {/* Columna del formulario */}
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-[#d2e4ff] via-[#e4d9ff] to-transparent opacity-70 blur-2xl" />
          <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-gradient-to-tr from-[#eaddff] to-transparent opacity-70 blur-2xl lg:hidden" />
        </div>

        <main className="relative w-full max-w-md">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-[#e5e7f8] bg-white p-6 pt-8 shadow-[0_8px_30px_-8px_rgba(99,81,139,0.25)] sm:p-8 sm:pt-10"
          >
            {/* Línea morada superior */}
            <div
              className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#3d3163] via-[#63518b] to-[#a58fd6]"
              aria-hidden="true"
            />

            <div className="flex items-center gap-3">
              <div className={CARD_HEADER_ICON}>
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">person_add</span>
              </div>
              <div className="flex flex-col">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={`${FONT_HEADLINE} text-2xl font-extrabold tracking-tight focus:outline-none`}
                >
                  Crear cuenta
                </h1>
                <p className="text-sm text-[#49454f]">Regístrate para organizar tus eventos.</p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
                <span>{error}</span>
              </div>
            )}

            {cuentaCreada && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[#1e5a34]/30 bg-[#eaf7ee] px-4 py-3 text-sm text-[#1e5a34]"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">task_alt</span>
                <span>
                  Tu cuenta se creó, pero no pudimos iniciar sesión automáticamente.{' '}
                  <Link to="/login" className="font-bold underline">Ve a iniciar sesión</Link>.
                </span>
              </div>
            )}

            <div>
              <label htmlFor="reg-username" className={LABEL}>Nombre de usuario</label>
              <div className={INPUT_WRAP}>
                <span className={INPUT_ICON} aria-hidden="true">person</span>
                <input
                  id="reg-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); limpiarCampo('username'); }}
                  className={`${INPUT} text-base! sm:text-sm!`}
                  aria-invalid={fieldErrors.username ? 'true' : undefined}
                  aria-describedby={describedBy('username', true)}
                  required
                />
              </div>
              <p id="reg-ayuda-username" className="mt-1.5 text-xs text-[#49454f]">
                Solo letras, números y los símbolos @ . + - _ (sin espacios).
              </p>
              {fieldErrors.username && (
                <p id="reg-error-username" className={ERROR} role="alert">{fieldErrors.username[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="reg-email" className={LABEL}>Correo electrónico</label>
              <div className={INPUT_WRAP}>
                <span className={INPUT_ICON} aria-hidden="true">mail</span>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); limpiarCampo('email'); }}
                  className={`${INPUT} text-base! sm:text-sm!`}
                  aria-invalid={fieldErrors.email ? 'true' : undefined}
                  aria-describedby={describedBy('email', false)}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p id="reg-error-email" className={ERROR} role="alert">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="reg-password" className={LABEL}>Contraseña</label>
              <div className={INPUT_WRAP}>
                <span className={INPUT_ICON} aria-hidden="true">lock</span>
                <input
                  id="reg-password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); limpiarCampo('password'); }}
                  className={`${INPUT} pr-12! text-base! sm:text-sm!`}
                  aria-invalid={fieldErrors.password ? 'true' : undefined}
                  aria-describedby={describedBy('password', true)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verPassword}
                  className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#49454f] transition-colors hover:bg-[#f2f3ff] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#63518b]"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {verPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <p id="reg-ayuda-password" className="mt-1.5 text-xs text-[#49454f]">
                Mínimo 8 caracteres.
              </p>
              {fieldErrors.password && (
                <p id="reg-error-password" className={ERROR} role="alert">{fieldErrors.password[0]}</p>
              )}
            </div>

            <button type="submit" className={BOTON_PRINCIPAL} disabled={enviando}>
              {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>

            <p className="text-center text-sm text-[#49454f]">
              ¿Ya tienes cuenta?{' '}
              <Link
                to="/login"
                className="rounded font-bold text-[#63518b] underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#63518b]"
              >
                Inicia sesión
              </Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
