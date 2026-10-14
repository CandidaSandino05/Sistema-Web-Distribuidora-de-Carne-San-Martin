import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  CircleDollarSign,
  Settings,
  Menu,
  ChevronDown,
  MapPin,
  LogOut,
} from 'lucide-react'
import logo from '../assets/logo.png'

const opciones = [
  { texto: 'Dashboard', ruta: '/dashboard', icono: LayoutDashboard },
  { texto: 'Inventario', ruta: '/inventario', icono: Package },
  { texto: 'Ventas', ruta: '/ventas', icono: ShoppingCart },
  { texto: 'Clientes', ruta: '/clientes', icono: Users },
  { texto: 'Cuentas por Cobrar', ruta: '/cuentas-por-cobrar', icono: CircleDollarSign },
  { texto: 'Configuración', ruta: '/configuracion', icono: Settings },
]

export default function Layout() {
  const [abierto, setAbierto] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex">
      {/* Fondo oscuro en celular cuando el menú está abierto */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Menú lateral */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 text-white flex flex-col transform transition-transform ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, #68070B, #3a0408)' }}
      >
        <div className="flex flex-col items-center px-4 pt-8 pb-6">
          <img src={logo} alt="Logo" className="w-20" />
          <h1 className="font-serif text-lg mt-3 tracking-wide text-center">
            CARNES SAN MARTÍN
          </h1>
          <p className="text-oro tracking-[0.3em] text-xs mt-1">GOLD PREMIUM</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {opciones.map(({ texto, ruta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive ? 'bg-carne font-semibold' : 'hover:bg-white/10'
                }`
              }
            >
              <Icono size={20} />
              {texto}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
          >
            <LogOut size={20} /> Cerrar sesión
          </button>
        </div>

        <div className="border-t border-white/20 mx-4 py-4 flex items-center gap-2 text-xs text-white/70">
          <MapPin size={14} /> Desde 1975 • Nandaime, Nicaragua
        </div>
      </aside>

      {/* Parte derecha */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white shadow-sm flex items-center justify-between gap-3 px-4 md:px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden shrink-0" onClick={() => setAbierto(true)}>
              <Menu size={24} />
            </button>
            <h2 className="font-semibold truncate">
              <span className="hidden md:inline">Distribuidora </span>
              Carnes San Martín
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-full bg-carne text-white flex items-center justify-center text-sm font-semibold">
              U
            </div>
            <span className="hidden md:inline text-sm">Usuario</span>
            <ChevronDown size={16} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>

        <footer className="text-center text-xs text-gray-400 py-4">
          Carnes San Martín | Sistema de Control de Operaciones
        </footer>
      </div>
    </div>
  )
}