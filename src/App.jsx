import { useEffect, useState } from 'react';
import { checkBackendHealth } from './services/api.js';

function App() {
  // 'loading' | 'ok' | 'error'
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    checkBackendHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <main className="status-screen">
      {status === 'loading' && <p>Conectando...</p>}
      {status === 'ok' && <p>conectado efectivo</p>}
      {status === 'error' && <p>No se pudo conectar con el backend</p>}
    </main>
  );
}

export default App;
