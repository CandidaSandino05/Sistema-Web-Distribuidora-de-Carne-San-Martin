import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import { useAuth } from '../AuthContext'

const datosIniciales = [
  { id: 1, nombre: 'Corbata', presentacion: 'Fresca', unidadMedida: 'lb', stock: 320, stockMinimo: 100, precioCompra: 4.2, precioVenta: 5.5 },
  { id: 2, nombre: 'Brocheta', presentacion: 'Empacada', unidadMedida: 'lb', stock: 85, stockMinimo: 100, precioCompra: 3.6, precioVenta: 4.2 },
  { id: 3, nombre: 'Tortas', presentacion: 'Congelada', unidadMedida: 'lb', stock: 540, stockMinimo: 200, precioCompra: 0.35, precioVenta: 0.45 },
  { id: 4, nombre: 'Lomo', presentacion: 'Fresco', unidadMedida: 'lb', stock: 210, stockMinimo: 80, precioCompra: 0.55, precioVenta: 0.71 },
  { id: 5, nombre: 'Costilla de res', presentacion: 'Fresca', unidadMedida: 'lb', stock: 60, stockMinimo: 70, precioCompra: 3.1, precioVenta: 3.9 },
]

const formularioVacio = {
  nombre: '',
  presentacion: '',
  unidadMedida: 'lb',
  stock: '',
  stockMinimo: '',
  precioCompra: '',
  precioVenta: '',
}

const estiloInput =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-oro'

export default function Inventario() {
  const { puede } = useAuth()
  const puedeEditar = puede('inventario.editar')

  const [productos, setProductos] = useState(datosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(formularioVacio)
  const [error, setError] = useState('')

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const bajos = productos.filter((p) => p.stock <= p.stockMinimo)

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm(formularioVacio)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (producto) => {
    setEditandoId(producto.id)
    setForm(producto)
    setError('')
    setModalAbierto(true)
  }

  const cerrarModal = () => setModalAbierto(false)

  const guardar = (e) => {
    e.preventDefault()
    if (!puedeEditar) return

    const stock = Number(form.stock)
    const stockMinimo = Number(form.stockMinimo)
    const precioCompra = Number(form.precioCompra)
    const precioVenta = Number(form.precioVenta)

    if (!form.nombre.trim()) return setError('El nombre del producto es obligatorio.')
    if (stock < 0) return setError('El stock no puede ser negativo.')
    if (stockMinimo < 0) return setError('El stock mínimo no puede ser negativo.')
    if (precioCompra <= 0 || precioVenta <= 0)
      return setError('Los precios deben ser mayores a cero.')
    if (precioVenta < precioCompra)
      return setError('El precio de venta no puede ser menor al precio de compra.')

    const datos = { ...form, stock, stockMinimo, precioCompra, precioVenta }

    if (editandoId) {
      setProductos(productos.map((p) => (p.id === editandoId ? { ...datos, id: editandoId } : p)))
    } else {
      setProductos([...productos, { ...datos, id: Date.now() }])
    }
    cerrarModal()
  }

  const eliminar = (producto) => {
    if (!puedeEditar) return
    const seguro = window.confirm(`¿Seguro que quieres eliminar "${producto.nombre}"?`)
    if (seguro) setProductos(productos.filter((p) => p.id !== producto.id))
  }

  return (
    <div className="space-y-6">
      {/* Título y botón */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-vino font-bold">Inventario</h1>
          <p className="text-gray-500 text-sm">
            {puedeEditar ? 'Control de productos y existencias' : 'Consulta de productos y existencias'}
          </p>
        </div>
        {puedeEditar && (
          <button
            onClick={abrirNuevo}
            className="flex items-center justify-center gap-2 bg-carne hover:bg-vino text-white font-semibold rounded-lg px-4 py-2.5 transition"
          >
            <Plus size={20} /> Nuevo producto
          </button>
        )}
      </div>

      {/* Alerta de stock bajo */}
      {bajos.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl p-4">
          <AlertTriangle size={22} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">
              {bajos.length} producto{bajos.length > 1 ? 's' : ''} con stock bajo
            </p>
            <p>{bajos.map((p) => p.nombre).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 bg-crema border border-gray-200 rounded-lg px-4 py-2.5 mb-4 focus-within:border-oro">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full outline-none bg-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-crema">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Presentación</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Mínimo</th>
                <th className="px-3 py-2">P. Compra</th>
                <th className="px-3 py-2">P. Venta</th>
                <th className="px-3 py-2">Estado</th>
                {puedeEditar && <th className="px-3 py-2 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const bajo = p.stock <= p.stockMinimo
                return (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-medium">{p.nombre}</td>
                    <td className="px-3 py-3">{p.presentacion}</td>
                    <td className="px-3 py-3">
                      {p.stock} {p.unidadMedida}
                    </td>
                    <td className="px-3 py-3">
                      {p.stockMinimo} {p.unidadMedida}
                    </td>
                    <td className="px-3 py-3">C${Number(p.precioCompra).toFixed(2)}</td>
                    <td className="px-3 py-3">C${Number(p.precioVenta).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          bajo ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {bajo ? 'Stock bajo' : 'Disponible'}
                      </span>
                    </td>
                    {puedeEditar && (
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirEditar(p)}
                            className="p-2 rounded-lg hover:bg-crema text-gray-600"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => eliminar(p)}
                            className="p-2 rounded-lg hover:bg-red-50 text-carne"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={puedeEditar ? 8 : 7} className="px-3 py-8 text-center text-gray-400">
                    No se encontraron productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ventana del formulario */}
      {puedeEditar && modalAbierto && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl text-vino font-bold">
                {editandoId ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={guardar} className="space-y-4">
              <Campo label="Nombre del producto">
                <input name="nombre" value={form.nombre} onChange={cambiar} className={estiloInput} />
              </Campo>

              <div className="grid grid-cols-2 gap-4">
                <Campo label="Presentación">
                  <input
                    name="presentacion"
                    value={form.presentacion}
                    onChange={cambiar}
                    placeholder="Fresca, congelada..."
                    className={estiloInput}
                  />
                </Campo>
                <Campo label="Unidad de medida">
                  <select
                    name="unidadMedida"
                    value={form.unidadMedida}
                    onChange={cambiar}
                    className={estiloInput}
                  >
                    <option value="lb">Libras (lb)</option>
                    <option value="kg">Kilos (kg)</option>
                    <option value="unidad">Unidad</option>
                  </select>
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Campo label="Stock actual">
                  <input type="number" step="any" name="stock" value={form.stock} onChange={cambiar} className={estiloInput} />
                </Campo>
                <Campo label="Stock mínimo">
                  <input type="number" step="any" name="stockMinimo" value={form.stockMinimo} onChange={cambiar} className={estiloInput} />
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Campo label="Precio de compra (C$)">
                  <input type="number" step="any" name="precioCompra" value={form.precioCompra} onChange={cambiar} className={estiloInput} />
                </Campo>
                <Campo label="Precio de venta (C$)">
                  <input type="number" step="any" name="precioVenta" value={form.precioVenta} onChange={cambiar} className={estiloInput} />
                </Campo>
              </div>

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

function Campo({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}