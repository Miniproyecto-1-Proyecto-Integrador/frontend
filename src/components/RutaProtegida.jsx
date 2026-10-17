import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BOTON_PRINCIPAL } from './ui';

export default function RutaProtegida() {
  const { status, reintentar } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <main className="status-screen">
        <p role="status">Verificando sesión…</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="status-screen flex-col gap-4 px-6 text-center">
        <p role="alert">
          No pudimos conectar con el servidor. Tu sesión sigue guardada; revisa tu
          conexión e inténtalo de nuevo.
        </p>
        <button type="button" className={BOTON_PRINCIPAL} onClick={reintentar}>
          Reintentar
        </button>
      </main>
    );
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}