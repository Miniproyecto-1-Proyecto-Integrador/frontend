import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout.jsx';
import RutaProtegida from './components/RutaProtegida';
import CrearEvento from './CrearEvento';
import DetalleEvento from './DetalleEvento';
import Hoy from './Hoy';
import Login from './Login';
import MisEventos from './MisEventos';
import Register from './Register';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/hoy" replace />} />
          <Route path="/crear" element={<CrearEvento />} />
          <Route path="/evento/:id" element={<DetalleEvento />} />
          <Route path="/evento" element={<MisEventos />} />
          <Route path="/hoy" element={<Hoy />} />

        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}