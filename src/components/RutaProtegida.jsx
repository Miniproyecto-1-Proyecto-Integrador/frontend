import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RutaProtegida() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <main className="status-screen">
        <p role="status">Verificando sesión…</p>
      </main>
    );
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}