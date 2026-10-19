import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  CircleDollarSign,
  BarChart3,
  Settings,
  Menu,
  ChevronDown,
  MapPin,
  LogOut,
  UserCircle,
} from 'lucide-react'
import logo from '../assets/logo.png'
import { useAuth } from '../AuthContext'

const opciones = [
  { texto: 'Dashboard', ruta: '/dashboard', icono: LayoutDashboard },
  { texto: 'Inventario', ruta: '/inventario', icono: Package },
  { texto: 'Ventas', ruta: '/ventas', icono: ShoppingCart },
  { texto: 'Clientes', ruta: '/clientes', icono: Users },
  { texto: 'Cuentas por Cobrar', ruta: '/cuentas-por-cobrar', icono: CircleDollarSign },
  { texto: 'Reportes', ruta: '/reportes', icono: BarChart3 },
  { texto: 'Configuración', ruta: '/configuracion', icono: Settings },
]

export default function Layout() {
  const [abierto, setAbierto] = useState(false)
  const [menuUsuario, setMenuUsuario] = useState(false)
  const cajaUsuario = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { usuario, logout, puedeVer } = useAuth()

  // Cierra el menú de usuario al hacer clic fuera de él
  useEffect(() => {
    const clicFuera = (e) => {
      if (cajaUsuario.current && !cajaUsuario.current.contains(e.target)) {
        setMenuUsuario(false)
      }
    }
    document.addEventListener('mousedown', clicFuera)
    return () => document.removeEventListener('mousedown', clicFuera)
  }, [])

  // Sin sesión iniciada, se regresa al login
  if (!usuario) return <Navigate to="/" replace />

  // Si el rol no puede ver esta pantalla, se regresa al Dashboard
  if (!puedeVer(pathname)) return <Navigate to="/dashboard" replace />

  const cerrarSesion = () => {
    setMenuUsuario(false)
    logout()
    navigate('/')
  }

  const opcionesVisibles = opciones.filter((o) => puedeVer(o.ruta))

  return (
    <div className="min-h-screen flex">
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
          {opcionesVisibles.map(({ texto, ruta, icono: Icono }) => (
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
            onClick={cerrarSesion}
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

          {/* Menú de usuario */}
          <div className="relative shrink-0" ref={cajaUsuario}>
            <button
              onClick={() => setMenuUsuario(!menuUsuario)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-crema transition"
            >
              <div className="w-9 h-9 rounded-full bg-carne text-white flex items-center justify-center text-sm font-semibold">
                {usuario.nombre.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline text-sm">{usuario.nombre}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${menuUsuario ? 'rotate-180' : ''}`}
              />
            </button>

            {menuUsuario && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold">{usuario.nombre}</p>
                  <p className="text-xs text-gray-500">Rol: {usuario.rol}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuUsuario(false)
                    navigate('/configuracion')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-crema text-left"
                >
                  <UserCircle size={18} className="text-gray-500" /> Mi perfil
                </button>
                <button
                  onClick={cerrarSesion}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-50 text-carne text-left border-t border-gray-100"
                >
                  <LogOut size={18} /> Cerrar sesión
                </button>
              </div>
            )}
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