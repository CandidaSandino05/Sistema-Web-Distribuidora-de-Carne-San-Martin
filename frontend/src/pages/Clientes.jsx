import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, X, History, Phone, MapPin } from 'lucide-react'

const datosIniciales = [
  {
    id: 1,
    nombre: 'Asados las Primas',
    telefono: '88881111',
    direccion: 'Mercado Mayoreo, Managua',
    email: 'lasprimas@correo.com',
    saldo: 275,
    compras: [
      { fecha: '12/08/2026', producto: 'Corbata', cantidad: '50 lb', total: 275, tipo: 'Crédito' },
      { fecha: '05/08/2026', producto: 'Lomo', cantidad: '80 lb', total: 56.8, tipo: 'Contado' },
    ],
  },
  {
    id: 2,
    nombre: 'Casa Sola',
    telefono: '88882222',
    direccion: 'Barrio Jorge Dimitrov, Managua',
    email: '',
    saldo: 504,
    compras: [
      { fecha: '12/08/2026', producto: 'Brocheta', cantidad: '120 lb', total: 504, tipo: 'Crédito' },
    ],
  },
  {
    id: 3,
    nombre: 'Asados Jehova',
    telefono: '88883333',
    direccion: 'Mercado Oriental, Managua',
    email: 'jehova@correo.com',
    saldo: 0,
    compras: [
      { fecha: '12/08/2026', producto: 'Tortas', cantidad: '500 lb', total: 225, tipo: 'Contado' },
    ],
  },
  {
    id: 4,
    nombre: 'Asados Ileanas',
    telefono: '88884444',
    direccion: 'Ciudad Sandino, Managua',
    email: '',
    saldo: 0,
    compras: [
      { fecha: '12/08/2026', producto: 'Lomo', cantidad: '450 lb', total: 320, tipo: 'Contado' },
    ],
  },
]

const formularioVacio = { nombre: '', telefono: '', direccion: '', email: '' }

const estiloInput =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-oro'

export default function Clientes() {
  const [clientes, setClientes] = useState(datosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(formularioVacio)
  const [error, setError] = useState('')
  const [verHistorial, setVerHistorial] = useState(null)

  const filtrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm(formularioVacio)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (cliente) => {
    setEditandoId(cliente.id)
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      email: cliente.email,
    })
    setError('')
    setModalAbierto(true)
  }

  const cerrarModal = () => setModalAbierto(false)

  const guardar = (e) => {
    e.preventDefault()

    if (!form.nombre.trim()) return setError('El nombre del cliente es obligatorio.')
    if (!/^\d{8}$/.test(form.telefono))
      return setError('El teléfono debe tener 8 dígitos (solo números).')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      return setError('El correo electrónico no es válido.')

    if (editandoId) {
      setClientes(clientes.map((c) => (c.id === editandoId ? { ...c, ...form } : c)))
    } else {
      setClientes([...clientes, { ...form, id: Date.now(), saldo: 0, compras: [] }])
    }
    cerrarModal()
  }

  const eliminar = (cliente) => {
    if (cliente.saldo > 0) {
      return window.alert(
        `No se puede eliminar a "${cliente.nombre}" porque tiene un saldo pendiente de C$${cliente.saldo.toFixed(2)}.`
      )
    }
    const seguro = window.confirm(`¿Seguro que quieres eliminar a "${cliente.nombre}"?`)
    if (seguro) setClientes(clientes.filter((c) => c.id !== cliente.id))
  }

  return (
    <div className="space-y-6">
      {/* Título y botón */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-vino font-bold">Clientes</h1>
          <p className="text-gray-500 text-sm">Registro de clientes y saldos pendientes</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center justify-center gap-2 bg-carne hover:bg-vino text-white font-semibold rounded-lg px-4 py-2.5 transition"
        >
          <Plus size={20} /> Nuevo cliente
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 bg-crema border border-gray-200 rounded-lg px-4 py-2.5 mb-4 focus-within:border-oro">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full outline-none bg-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-crema">
              <tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Contacto</th>
                <th className="px-3 py-2">Dirección</th>
                <th className="px-3 py-2">Saldo pendiente</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-3 py-3 font-medium">{c.nombre}</td>
                  <td className="px-3 py-3">
                    <p className="flex items-center gap-1">
                      <Phone size={14} className="text-gray-400" /> {c.telefono}
                    </p>
                    {c.email && <p className="text-gray-500 text-xs">{c.email}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <p className="flex items-center gap-1">
                      <MapPin size={14} className="text-gray-400 shrink-0" /> {c.direccion || '—'}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        c.saldo > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      C${c.saldo.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setVerHistorial(c)}
                        className="p-2 rounded-lg hover:bg-crema text-gray-600"
                        title="Historial de compras"
                      >
                        <History size={18} />
                      </button>
                      <button
                        onClick={() => abrirEditar(c)}
                        className="p-2 rounded-lg hover:bg-crema text-gray-600"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => eliminar(c)}
                        className="p-2 rounded-lg hover:bg-red-50 text-carne"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ventana: formulario */}
      {modalAbierto && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl text-vino font-bold">
                {editandoId ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={guardar} className="space-y-4">
              <Campo label="Nombre del cliente">
                <input name="nombre" value={form.nombre} onChange={cambiar} className={estiloInput} />
              </Campo>
              <Campo label="Teléfono">
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={cambiar}
                  placeholder="8 dígitos"
                  className={estiloInput}
                />
              </Campo>
              <Campo label="Dirección">
                <input name="direccion" value={form.direccion} onChange={cambiar} className={estiloInput} />
              </Campo>
              <Campo label="Correo electrónico (opcional)">
                <input name="email" value={form.email} onChange={cambiar} className={estiloInput} />
              </Campo>

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

      {/* Ventana: historial de compras */}
      {verHistorial && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-2xl text-vino font-bold">Historial de compras</h2>
              <button
                onClick={() => setVerHistorial(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">{verHistorial.nombre}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-crema">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {verHistorial.compras.map((h, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-3">{h.fecha}</td>
                      <td className="px-3 py-3">{h.producto}</td>
                      <td className="px-3 py-3">{h.cantidad}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            h.tipo === 'Crédito'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {h.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-3">C${h.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {verHistorial.compras.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                        Este cliente aún no tiene compras.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-gray-200 mt-4 pt-4">
              <span className="text-gray-600">Saldo pendiente</span>
              <span className="text-lg font-bold text-vino">
                C${verHistorial.saldo.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}