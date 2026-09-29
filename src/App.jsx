import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout.jsx';
import RutaProtegida from './components/RutaProtegida';
import CrearEvento from './CrearEvento';
import DetalleEvento from './DetalleEvento';
import Login from './Login';
import MisEventos from './MisEventos';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/crear" replace />} />
          <Route path="/crear" element={<CrearEvento />} />
          <Route path="/evento/:id" element={<DetalleEvento />} />
          <Route path="/evento" element={<MisEventos />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}