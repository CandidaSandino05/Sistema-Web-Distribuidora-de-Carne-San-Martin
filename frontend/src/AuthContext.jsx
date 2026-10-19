import { createContext, useContext, useState } from 'react'

// Cuentas de prueba (cuando haya backend, esto vendrá de la base de datos)
const cuentas = [
  { usuario: 'admin', clave: 'admin123', nombre: 'Administrador General', email: 'admin@sanmartin.com', rol: 'Administrador' },
  { usuario: 'mlopez', clave: 'vendedor123', nombre: 'María López', email: 'maria@sanmartin.com', rol: 'Vendedor' },
  { usuario: 'agomez', clave: 'gerente123', nombre: 'Ana Gómez', email: 'ana@sanmartin.com', rol: 'Gerente' },
]

// Qué acciones puede hacer cada rol
const permisos = {
  Administrador: [
    'inventario.editar',
    'ventas.registrar',
    'ventas.descuento',
    'clientes.editar',
    'clientes.eliminar',
    'cxc.pagar',
    'perfil.editar',
  ],
  Vendedor: ['ventas.registrar', 'clientes.editar', 'cxc.pagar'],
  Gerente: [],
}

// Qué pantallas puede ver cada rol
const rutasPorRol = {
  Administrador: [
    '/dashboard',
    '/inventario',
    '/ventas',
    '/clientes',
    '/cuentas-por-cobrar',
    '/reportes',
    '/configuracion',
  ],
  Vendedor: [
    '/dashboard',
    '/inventario',
    '/ventas',
    '/clientes',
    '/cuentas-por-cobrar',
    '/configuracion',
  ],
  Gerente: ['/dashboard', '/reportes', '/configuracion'],
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('usuario'))
    } catch {
      return null
    }
  })

  const login = (user, clave) => {
    const cuenta = cuentas.find(
      (c) => c.usuario === user.trim().toLowerCase() && c.clave === clave
    )
    if (!cuenta) return false
    const { clave: _omitida, ...sinClave } = cuenta
    sessionStorage.setItem('usuario', JSON.stringify(sinClave))
    setUsuario(sinClave)
    return true
  }

  const logout = () => {
    sessionStorage.removeItem('usuario')
    setUsuario(null)
  }

  const puede = (permiso) => permisos[usuario?.rol]?.includes(permiso) ?? false
  const puedeVer = (ruta) => rutasPorRol[usuario?.rol]?.includes(ruta) ?? false

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        logout,
        puede,
        puedeVer,
        esAdmin: usuario?.rol === 'Administrador',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)