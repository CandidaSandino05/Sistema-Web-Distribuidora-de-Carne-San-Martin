import { useState } from 'react'
import {
  Users,
  UserCircle,
  Store,
  Plus,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '../AuthContext'

const usuariosIniciales = [
  { id: 1, nombre: 'Administrador General', usuario: 'admin', email: 'admin@sanmartin.com', rol: 'Administrador', activo: true },
  { id: 2, nombre: 'María López', usuario: 'mlopez', email: 'maria@sanmartin.com', rol: 'Vendedor', activo: true },
  { id: 3, nombre: 'Carlos Pérez', usuario: 'cperez', email: 'carlos@sanmartin.com', rol: 'Vendedor', activo: false },
  { id: 4, nombre: 'Ana Gómez', usuario: 'agomez', email: 'ana@sanmartin.com', rol: 'Gerente', activo: true },
]

const roles = {
  Administrador: 'Gestiona usuarios, productos y precios, y supervisa todos los reportes.',
  Vendedor: 'Registra ventas (contado y crédito), consulta inventario y registra clientes.',
  Gerente: 'Consulta reportes de ventas, inventario y cuentas por cobrar (solo lectura).',
}

const coloresRol = {
  Administrador: 'bg-purple-100 text-purple-700',
  Vendedor: 'bg-blue-100 text-blue-700',
  Gerente: 'bg-amber-100 text-amber-700',
}

const formularioVacio = {
  nombre: '',
  usuario: '',
  email: '',
  rol: 'Vendedor',
  clave: '',
}

const estiloInput =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-oro'

export default function Configuracion() {
  const { esAdmin } = useAuth()
  const [pestana, setPestana] = useState(esAdmin ? 'usuarios' : 'perfil')

  // Solo el administrador ve las pestañas Usuarios y Negocio
  const pestanas = [
    ...(esAdmin ? [{ id: 'usuarios', texto: 'Usuarios', icono: Users }] : []),
    { id: 'perfil', texto: 'Mi perfil', icono: UserCircle },
    ...(esAdmin ? [{ id: 'negocio', texto: 'Negocio', icono: Store }] : []),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-vino font-bold">Configuración</h1>
        <p className="text-gray-500 text-sm">
          {esAdmin ? 'Usuarios, perfil y datos del negocio' : 'Tu perfil y contraseña'}
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 overflow-x-auto">
        {pestanas.map(({ id, texto, icono: Icono }) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold whitespace-nowrap transition ${
              pestana === id
                ? 'bg-carne text-white border-carne'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-crema'
            }`}
          >
            <Icono size={18} /> {texto}
          </button>
        ))}
      </div>

      {esAdmin && pestana === 'usuarios' && <Usuarios />}
      {pestana === 'perfil' && <Perfil />}
      {esAdmin && pestana === 'negocio' && <Negocio />}
    </div>
  )
}

/* ---------------------------- USUARIOS ---------------------------- */

function Usuarios() {
  const [usuarios, setUsuarios] = useState(usuariosIniciales)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(formularioVacio)
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')

  const admins = usuarios.filter((u) => u.rol === 'Administrador' && u.activo)

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm(formularioVacio)
    setVerClave(false)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (u) => {
    setEditandoId(u.id)
    setForm({ nombre: u.nombre, usuario: u.usuario, email: u.email, rol: u.rol, clave: '' })
    setVerClave(false)
    setError('')
    setModalAbierto(true)
  }

  const cerrarModal = () => setModalAbierto(false)

  const guardar = (e) => {
    e.preventDefault()

    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')
    if (!form.usuario.trim()) return setError('El nombre de usuario es obligatorio.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('El correo electrónico no es válido.')

    const repetido = usuarios.some(
      (u) => u.usuario.toLowerCase() === form.usuario.trim().toLowerCase() && u.id !== editandoId
    )
    if (repetido) return setError('Ese nombre de usuario ya existe.')

    if (!editandoId && form.clave.length < 6)
      return setError('La contraseña debe tener al menos 6 caracteres.')
    if (editandoId && form.clave && form.clave.length < 6)
      return setError('La nueva contraseña debe tener al menos 6 caracteres.')

    // No dejar al sistema sin administrador
    if (editandoId) {
      const actual = usuarios.find((u) => u.id === editandoId)
      if (actual.rol === 'Administrador' && form.rol !== 'Administrador' && admins.length === 1)
        return setError('Debe existir al menos un administrador activo.')
    }

    const datos = {
      nombre: form.nombre.trim(),
      usuario: form.usuario.trim(),
      email: form.email.trim(),
      rol: form.rol,
    }

    if (editandoId) {
      setUsuarios(usuarios.map((u) => (u.id === editandoId ? { ...u, ...datos } : u)))
    } else {
      setUsuarios([...usuarios, { ...datos, id: Date.now(), activo: true }])
    }
    cerrarModal()
  }

  const esUltimoAdmin = (u) =>
    u.rol === 'Administrador' && u.activo && admins.length === 1

  const alternarEstado = (u) => {
    if (u.activo && esUltimoAdmin(u))
      return window.alert('No puedes desactivar al último administrador.')
    setUsuarios(usuarios.map((x) => (x.id === u.id ? { ...x, activo: !x.activo } : x)))
  }

  const eliminar = (u) => {
    if (esUltimoAdmin(u)) return window.alert('No puedes eliminar al último administrador.')
    const seguro = window.confirm(`¿Seguro que quieres eliminar a "${u.nombre}"?`)
    if (seguro) setUsuarios(usuarios.filter((x) => x.id !== u.id))
  }

  return (
    <div className="space-y-6">
      {/* Qué hace cada rol */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(roles).map(([rol, descripcion]) => (
          <div key={rol} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={20} className="text-carne" />
              <h3 className="font-semibold">{rol}</h3>
            </div>
            <p className="text-sm text-gray-500">{descripcion}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Usuarios del sistema</h2>
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-2 bg-carne hover:bg-vino text-white font-semibold rounded-lg px-4 py-2.5 transition"
          >
            <Plus size={20} /> Nuevo usuario
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-crema">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Correo</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-3 py-3 font-medium">{u.nombre}</td>
                  <td className="px-3 py-3">{u.usuario}</td>
                  <td className="px-3 py-3">{u.email}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${coloresRol[u.rol]}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => alternarEstado(u)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold transition ${
                        u.activo
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title="Clic para cambiar el estado"
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="p-2 rounded-lg hover:bg-crema text-gray-600"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => eliminar(u)}
                        className="p-2 rounded-lg hover:bg-red-50 text-carne"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ventana: formulario de usuario */}
      {modalAbierto && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl text-vino font-bold">
                {editandoId ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={guardar} className="space-y-4">
              <Campo label="Nombre completo">
                <input name="nombre" value={form.nombre} onChange={cambiar} className={estiloInput} />
              </Campo>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Nombre de usuario">
                  <input name="usuario" value={form.usuario} onChange={cambiar} className={estiloInput} />
                </Campo>
                <Campo label="Rol">
                  <select name="rol" value={form.rol} onChange={cambiar} className={estiloInput}>
                    <option>Administrador</option>
                    <option>Vendedor</option>
                    <option>Gerente</option>
                  </select>
                </Campo>
              </div>

              <Campo label="Correo electrónico">
                <input name="email" value={form.email} onChange={cambiar} className={estiloInput} />
              </Campo>

              <Campo label={editandoId ? 'Nueva contraseña (opcional)' : 'Contraseña'}>
                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 focus-within:border-oro">
                  <input
                    type={verClave ? 'text' : 'password'}
                    name="clave"
                    value={form.clave}
                    onChange={cambiar}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full py-2.5 outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setVerClave(!verClave)}
                    className="text-gray-400"
                  >
                    {verClave ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </Campo>

              <p className="text-xs text-gray-500">{roles[form.rol]}</p>

              {error && (
                <p className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-crema"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-carne hover:bg-vino text-white font-semibold transition"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------------------- MI PERFIL ---------------------------- */

function Perfil() {
  const { usuario, puede } = useAuth()
  const puedeEditar = puede('perfil.editar')
  const [datos, setDatos] = useState({ nombre: usuario.nombre, email: usuario.email })
  const [claves, setClaves] = useState({ actual: '', nueva: '', repetir: '' })
  const [errorDatos, setErrorDatos] = useState('')
  const [exitoDatos, setExitoDatos] = useState('')
  const [errorClave, setErrorClave] = useState('')
  const [exitoClave, setExitoClave] = useState('')

  const guardarDatos = (e) => {
    e.preventDefault()
    setExitoDatos('')
    if (!datos.nombre.trim()) return setErrorDatos('El nombre es obligatorio.')
    if (!/^\S+@\S+\.\S+$/.test(datos.email)) return setErrorDatos('El correo electrónico no es válido.')
    setErrorDatos('')
    setExitoDatos('Tus datos se guardaron correctamente.')
  }

  const cambiarClave = (e) => {
    e.preventDefault()
    setExitoClave('')
    if (!claves.actual) return setErrorClave('Escribe tu contraseña actual.')
    if (claves.nueva.length < 6)
      return setErrorClave('La nueva contraseña debe tener al menos 6 caracteres.')
    if (claves.nueva !== claves.repetir) return setErrorClave('Las contraseñas nuevas no coinciden.')
    setErrorClave('')
    setExitoClave('Tu contraseña se cambió correctamente.')
    setClaves({ actual: '', nueva: '', repetir: '' })
  }

  // Vendedor y gerente: solo lectura
  if (!puedeEditar) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4 max-w-xl">
        <h2 className="font-semibold text-lg">Mis datos</h2>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-carne text-white flex items-center justify-center text-xl font-semibold">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{usuario.nombre}</p>
            <p className="text-xs text-gray-500">Rol: {usuario.rol}</p>
          </div>
        </div>

        <div className="text-sm space-y-2">
          <p>
            <span className="text-gray-500">Usuario:</span> {usuario.usuario}
          </p>
          <p>
            <span className="text-gray-500">Correo:</span> {usuario.email}
          </p>
        </div>

        <p className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg px-3 py-2">
          Para cambiar tus datos o tu contraseña, contacta al administrador.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={guardarDatos} className="bg-white rounded-xl shadow-sm p-5 space-y-4 h-fit">
        <h2 className="font-semibold text-lg">Mis datos</h2>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-carne text-white flex items-center justify-center text-xl font-semibold">
            {datos.nombre.trim().charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold">{datos.nombre || 'Usuario'}</p>
            <p className="text-xs text-gray-500">Rol: {usuario.rol}</p>
          </div>
        </div>

        <Campo label="Nombre completo">
          <input
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            className={estiloInput}
          />
        </Campo>
        <Campo label="Correo electrónico">
          <input
            value={datos.email}
            onChange={(e) => setDatos({ ...datos, email: e.target.value })}
            className={estiloInput}
          />
        </Campo>

        <Mensajes error={errorDatos} exito={exitoDatos} />

        <button
          type="submit"
          className="bg-carne hover:bg-vino text-white font-semibold rounded-lg px-4 py-2.5 transition"
        >
          Guardar cambios
        </button>
      </form>

      <form onSubmit={cambiarClave} className="bg-white rounded-xl shadow-sm p-5 space-y-4 h-fit">
        <h2 className="font-semibold text-lg">Cambiar contraseña</h2>
        <Campo label="Contraseña actual">
          <input
            type="password"
            value={claves.actual}
            onChange={(e) => setClaves({ ...claves, actual: e.target.value })}
            className={estiloInput}
          />
        </Campo>
        <Campo label="Nueva contraseña">
          <input
            type="password"
            value={claves.nueva}
            onChange={(e) => setClaves({ ...claves, nueva: e.target.value })}
            className={estiloInput}
          />
        </Campo>
        <Campo label="Repite la nueva contraseña">
          <input
            type="password"
            value={claves.repetir}
            onChange={(e) => setClaves({ ...claves, repetir: e.target.value })}
            className={estiloInput}
          />
        </Campo>

        <Mensajes error={errorClave} exito={exitoClave} />

        <button
          type="submit"
          className="bg-carne hover:bg-vino text-white font-semibold rounded-lg px-4 py-2.5 transition"
        >
          Cambiar contraseña
        </button>
      </form>
    </div>
  )
}

/* ----------------------------- NEGOCIO ----------------------------- */

function Negocio() {
  const [datos, setDatos] = useState({
    nombre: 'Distribuidora de Carnes San Martín',
    telefono: '22221111',
    direccion: 'Mercado Mayoreo, Managua',
    ciudad: 'Nandaime, Nicaragua',
  })
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value })

  const guardar = (e) => {
    e.preventDefault()
    setExito('')
    if (!datos.nombre.trim()) return setError('El nombre del negocio es obligatorio.')
    if (!/^\d{8}$/.test(datos.telefono))
      return setError('El teléfono debe tener 8 dígitos (solo números).')
    setError('')
    setExito('Los datos del negocio se guardaron correctamente.')
  }

  return (
    <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm p-5 space-y-4 max-w-2xl">
      <h2 className="font-semibold text-lg">Datos de la distribuidora</h2>

      <Campo label="Nombre del negocio">
        <input name="nombre" value={datos.nombre} onChange={cambiar} className={estiloInput} />
      </Campo>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Teléfono">
          <input name="telefono" value={datos.telefono} onChange={cambiar} className={estiloInput} />
        </Campo>
        <Campo label="Ciudad">
          <input name="ciudad" value={datos.ciudad} onChange={cambiar} className={estiloInput} />
        </Campo>
      </div>
      <Campo label="Dirección">
        <input name="direccion" value={datos.direccion} onChange={cambiar} className={estiloInput} />
      </Campo>

      <Mensajes error={error} exito={exito} />

      <button
        type="submit"
        className="bg-carne hover:bg-vino text-white font-semibold rounded-lg px-4 py-2.5 transition"
      >
        Guardar cambios
      </button>
    </form>
  )
}

/* ------------------------- piezas compartidas ------------------------- */

function Campo({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function Mensajes({ error, exito }) {
  return (
    <>
      {error && <p className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</p>}
      {exito && (
        <p className="flex items-center gap-2 bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">
          <CheckCircle2 size={18} /> {exito}
        </p>
      )}
    </>
  )
}