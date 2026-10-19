import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import EnConstruccion from './pages/EnConstruccion'
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/ventas" element={<EnConstruccion titulo="Ventas" />} />
        <Route path="/clientes" element={<EnConstruccion titulo="Clientes" />} />
        <Route path="/cuentas-por-cobrar" element={<EnConstruccion titulo="Cuentas por Cobrar" />} />
        <Route path="/configuracion" element={<EnConstruccion titulo="Configuración" />} />
      </Route>
    </Routes>
  )
}