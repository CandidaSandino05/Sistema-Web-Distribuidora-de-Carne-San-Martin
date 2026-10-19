import { useState } from 'react'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'

const productosIniciales = [
  { id: 1, nombre: 'Corbata', stock: 320, precio: 5.5 },
  { id: 2, nombre: 'Brocheta', stock: 85, precio: 4.2 },
  { id: 3, nombre: 'Tortas', stock: 540, precio: 0.45 },
  { id: 4, nombre: 'Lomo', stock: 210, precio: 0.71 },
  { id: 5, nombre: 'Costilla de res', stock: 60, precio: 3.9 },
]

const clientes = [
  'Asados las Primas',
  'Casa Sola',
  'Asados Jehova',
  'Asados Ileanas',
]

const historialInicial = [
  { id: 1, cliente: 'Asados las Primas', fecha: '12/08/2026', tipo: 'Contado', total: 275 },
  { id: 2, cliente: 'Casa Sola', fecha: '12/08/2026', tipo: 'Crédito', total: 504 },
  { id: 3, cliente: 'Asados Jehova', fecha: '12/08/2026', tipo: 'Contado', total: 225 },
]

const estiloInput =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-oro'

export default function Ventas() {
  const [productos, setProductos] = useState(productosIniciales)
  const [historial, setHistorial] = useState(historialInicial)

  const [cliente, setCliente] = useState('')
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [carrito, setCarrito] = useState([])
  const [tipoPago, setTipoPago] = useState('Contado')
  const [fechaVence, setFechaVence] = useState('')

  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Cálculos
  const subtotal = carrito.reduce((suma, i) => suma + i.cantidad * i.precio, 0)
  const totalLibras = carrito.reduce((suma, i) => suma + i.cantidad, 0)
  const porcentaje = totalLibras >= 300 ? 10 : totalLibras >= 100 ? 5 : 0
  const descuento = (subtotal * porcentaje) / 100
  const total = subtotal - descuento

  const agregar = () => {
    setError('')
    setExito('')
    const producto = productos.find((p) => p.id === Number(productoId))
    const cant = Number(cantidad)

    if (!producto) return setError('Selecciona un producto.')
    if (!cant || cant <= 0) return setError('La cantidad debe ser mayor a cero.')

    const yaEnCarrito = carrito.find((i) => i.id === producto.id)
    const totalPedido = cant + (yaEnCarrito ? yaEnCarrito.cantidad : 0)

    if (totalPedido > producto.stock) {
      return setError(
        `No hay existencias suficientes de ${producto.nombre}. Disponible: ${producto.stock} lb.`
      )
    }

    if (yaEnCarrito) {
      setCarrito(carrito.map((i) => (i.id === producto.id ? { ...i, cantidad: totalPedido } : i)))
    } else {
      setCarrito([...carrito, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: cant }])
    }
    setProductoId('')
    setCantidad('')
  }

  const quitar = (id) => setCarrito(carrito.filter((i) => i.id !== id))

  const registrar = () => {
    setError('')
    setExito('')

    if (!cliente) return setError('Selecciona un cliente.')
    if (carrito.length === 0) return setError('Agrega al menos un producto a la venta.')
    if (tipoPago === 'Crédito' && !fechaVence)
      return setError('Indica la fecha de vencimiento para la venta a crédito.')

    const seguro = window.confirm(
      `¿Registrar la venta a ${cliente} por C$${total.toFixed(2)} (${tipoPago})?`
    )
    if (!seguro) return

    // Descontar del inventario
    setProductos(
      productos.map((p) => {
        const item = carrito.find((i) => i.id === p.id)
        return item ? { ...p, stock: p.stock - item.cantidad } : p
      })
    )

    const hoy = new Date().toLocaleDateString('es-ES')
    setHistorial([{ id: Date.now(), cliente, fecha: hoy, tipo: tipoPago, total }, ...historial])

    setExito(
      tipoPago === 'Crédito'
        ? 'Venta registrada. Se generó la cuenta por cobrar.'
        : 'Venta registrada correctamente.'
    )
    setCarrito([])
    setCliente('')
    setTipoPago('Contado')
    setFechaVence('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-vino font-bold">Ventas</h1>
        <p className="text-gray-500 text-sm">Registro de ventas al contado y al crédito</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Columna izquierda: armar la venta */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-lg">Datos de la venta</h2>

            <label className="block text-sm">
              <span className="text-gray-600">Cliente</span>
              <select
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className={`${estiloInput} mt-1`}
              >
                <option value="">Selecciona un cliente</option>
                {clientes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3 items-end">
              <label className="block text-sm">
                <span className="text-gray-600">Producto</span>
                <select
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                  className={`${estiloInput} mt-1`}
                >
                  <option value="">Selecciona un producto</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — C${p.precio.toFixed(2)}/lb (stock: {p.stock})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-gray-600">Cantidad (lb)</span>
                <input
                  type="number"
                  step="any"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className={`${estiloInput} mt-1`}
                />
              </label>

              <button
                onClick={agregar}
                className="flex items-center justify-center gap-2 bg-carne hover:bg-vino text-white font-semibold rounded-lg px-4 py-2.5 transition"
              >
                <Plus size={20} /> Agregar
              </button>
            </div>
          </div>

          {/* Carrito */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-lg mb-4">Productos de la venta</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-crema">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Subtotal</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map((i) => (
                    <tr key={i.id} className="border-t border-gray-100">
                      <td className="px-3 py-3">{i.nombre}</td>
                      <td className="px-3 py-3">{i.cantidad} lb</td>
                      <td className="px-3 py-3">C${i.precio.toFixed(2)}</td>
                      <td className="px-3 py-3">C${(i.cantidad * i.precio).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => quitar(i.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-carne"
                          title="Quitar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {carrito.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                        Aún no has agregado productos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Columna derecha: resumen y pago */}
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4 h-fit">
          <h2 className="font-semibold text-lg">Resumen</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>C${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Descuento por volumen ({porcentaje}%)</span>
              <span>- C${descuento.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
              <span>Total</span>
              <span className="text-vino">C${total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Tipo de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {['Contado', 'Crédito'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoPago(t)}
                  className={`py-2.5 rounded-lg border font-semibold transition ${
                    tipoPago === t
                      ? 'bg-carne text-white border-carne'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-crema'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tipoPago === 'Crédito' && (
            <label className="block text-sm">
              <span className="text-gray-600">Fecha de vencimiento</span>
              <input
                type="date"
                value={fechaVence}
                onChange={(e) => setFechaVence(e.target.value)}
                className={`${estiloInput} mt-1`}
              />
            </label>
          )}

          {error && <p className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</p>}
          {exito && (
            <p className="flex items-center gap-2 bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">
              <CheckCircle2 size={18} /> {exito}
            </p>
          )}

          <button
            onClick={registrar}
            className="w-full bg-carne hover:bg-vino text-white font-semibold rounded-lg py-3 transition"
          >
            Registrar venta
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-lg mb-4">Ventas recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-crema">
              <tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((v) => (
                <tr key={v.id} className="border-t border-gray-100">
                  <td className="px-3 py-3">{v.cliente}</td>
                  <td className="px-3 py-3">{v.fecha}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        v.tipo === 'Crédito'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {v.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-3">C${v.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}