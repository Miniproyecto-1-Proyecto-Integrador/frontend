import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { checkBackendHealth } from './services/api.js';
import Layout from './components/layout.jsx';
import CrearEvento from './CrearEvento';
import DetalleEvento from './DetalleEvento';

export default function App() {
  // 'loading' | 'ok' | 'error'
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    checkBackendHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') {
    return (
      <main className="status-screen">
        <p>Conectando...</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="status-screen">
        <p>No se pudo conectar con el backend</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/crear" replace />} />
        <Route path="/crear" element={<CrearEvento />} />
        <Route path="/evento/:id" element={<DetalleEvento />} />
      </Route>
    </Routes>
  );
}