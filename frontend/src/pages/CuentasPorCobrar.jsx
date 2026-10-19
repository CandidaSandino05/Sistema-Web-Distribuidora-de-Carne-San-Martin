import { useState } from 'react'
import { Search, X, AlertTriangle, Clock, Wallet, CheckCircle2, Banknote } from 'lucide-react'

// Crea una fecha en formato AAAA-MM-DD sumando (o restando) días a hoy
const fechaEnDias = (dias) => {
  const f = new Date()
  f.setDate(f.getDate() + dias)
  return f.toISOString().slice(0, 10)
}

const datosIniciales = [
  { id: 1, cliente: 'Asados las Primas', montoOriginal: 275, saldo: 275, vence: fechaEnDias(-5) },
  { id: 2, cliente: 'Casa Sola', montoOriginal: 504, saldo: 354, vence: fechaEnDias(4) },
  { id: 3, cliente: 'Asados Jehova', montoOriginal: 225, saldo: 225, vence: fechaEnDias(20) },
  { id: 4, cliente: 'Asados Ileanas', montoOriginal: 320, saldo: 0, vence: fechaEnDias(-10) },
]

const estiloInput =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-oro'

// Calcula el estado de una cuenta según su saldo y su fecha de vencimiento
const obtenerEstado = (cuenta) => {
  if (cuenta.saldo <= 0) return 'Pagada'
  const hoy = fechaEnDias(0)
  if (cuenta.vence < hoy) return 'Vencida'
  if (cuenta.vence <= fechaEnDias(7)) return 'Por vencer'
  return 'Pendiente'
}

const colores = {
  Pagada: 'bg-green-100 text-green-700',
  Vencida: 'bg-red-100 text-red-700',
  'Por vencer': 'bg-amber-100 text-amber-700',
  Pendiente: 'bg-blue-100 text-blue-700',
}

const formatearFecha = (iso) => {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export default function CuentasPorCobrar() {
  const [cuentas, setCuentas] = useState(datosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('Todas')
  const [cuentaPago, setCuentaPago] = useState(null)
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')

  const conEstado = cuentas.map((c) => ({ ...c, estado: obtenerEstado(c) }))

  const filtradas = conEstado.filter((c) => {
    const coincideNombre = c.cliente.toLowerCase().includes(busqueda.toLowerCase())
    const coincideFiltro =
      filtro === 'Todas' ||
      (filtro === 'Pendientes' && (c.estado === 'Pendiente' || c.estado === 'Por vencer')) ||
      (filtro === 'Vencidas' && c.estado === 'Vencida') ||
      (filtro === 'Pagadas' && c.estado === 'Pagada')
    return coincideNombre && coincideFiltro
  })

  const saldoTotal = conEstado.reduce((suma, c) => suma + c.saldo, 0)
  const vencidas = conEstado.filter((c) => c.estado === 'Vencida')
  const porVencer = conEstado.filter((c) => c.estado === 'Por vencer')
  const saldoVencido = vencidas.reduce((suma, c) => suma + c.saldo, 0)

  const abrirPago = (cuenta) => {
    setCuentaPago(cuenta)
    setMonto('')
    setError('')
  }

  const cerrarPago = () => setCuentaPago(null)

  const registrarPago = (e) => {
    e.preventDefault()
    const valor = Number(monto)

    if (!valor || valor <= 0) return setError('El monto del pago debe ser mayor a cero.')
    if (valor > cuentaPago.saldo)
      return setError(`El pago no puede ser mayor al saldo pendiente (C$${cuentaPago.saldo.toFixed(2)}).`)

    const seguro = window.confirm(
      `¿Registrar un pago de C$${valor.toFixed(2)} de ${cuentaPago.cliente}?`
    )
    if (!seguro) return

    setCuentas(
      cuentas.map((c) =>
        c.id === cuentaPago.id ? { ...c, saldo: Number((c.saldo - valor).toFixed(2)) } : c
      )
    )
    cerrarPago()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-vino font-bold">Cuentas por Cobrar</h1>
        <p className="text-gray-500 text-sm">Seguimiento de créditos y pagos de clientes</p>
      </div>

      {/* Alertas */}
      {vencidas.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-300 text-red-800 rounded-xl p-4">
          <AlertTriangle size={22} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">
              {vencidas.length} cuenta{vencidas.length > 1 ? 's' : ''} vencida
              {vencidas.length > 1 ? 's' : ''}
            </p>
            <p>{vencidas.map((c) => c.cliente).join(', ')}</p>
          </div>
        </div>
      )}
      {porVencer.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl p-4">
          <Clock size={22} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">
              {porVencer.length} cuenta{porVencer.length > 1 ? 's' : ''} por vencer en los próximos 7 días
            </p>
            <p>{porVencer.map((c) => c.cliente).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tarjeta icono={Wallet} titulo="Saldo total por cobrar" valor={`C$${saldoTotal.toFixed(2)}`} />
        <Tarjeta
          icono={AlertTriangle}
          titulo="Saldo vencido"
          valor={`C$${saldoVencido.toFixed(2)}`}
          rojo
        />
        <Tarjeta icono={Clock} titulo="Cuentas por vencer" valor={porVencer.length} />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex flex-1 items-center gap-3 bg-crema border border-gray-200 rounded-lg px-4 py-2.5 focus-within:border-oro">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full outline-none bg-transparent"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['Todas', 'Pendientes', 'Vencidas', 'Pagadas'].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap transition ${
                  filtro === f
                    ? 'bg-carne text-white border-carne'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-crema'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-crema">
              <tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Monto original</th>
                <th className="px-3 py-2">Saldo pendiente</th>
                <th className="px-3 py-2">Vence</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-3 py-3 font-medium">{c.cliente}</td>
                  <td className="px-3 py-3">C${c.montoOriginal.toFixed(2)}</td>
                  <td className="px-3 py-3 font-semibold">C${c.saldo.toFixed(2)}</td>
                  <td className="px-3 py-3">{formatearFecha(c.vence)}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colores[c.estado]}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      {c.saldo > 0 ? (
                        <button
                          onClick={() => abrirPago(c)}
                          className="flex items-center gap-1 bg-carne hover:bg-vino text-white text-xs font-semibold rounded-lg px-3 py-2 transition"
                        >
                          <Banknote size={16} /> Registrar pago
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-green-700 text-xs font-semibold">
                          <CheckCircle2 size={16} /> Saldada
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                    No se encontraron cuentas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ventana: registrar pago */}
      {cuentaPago && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-2xl text-vino font-bold">Registrar pago</h2>
              <button onClick={cerrarPago} className="text-gray-400 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">{cuentaPago.cliente}</p>

            <div className="bg-crema rounded-lg p-3 flex justify-between text-sm mb-4">
              <span className="text-gray-600">Saldo pendiente</span>
              <span className="font-bold text-vino">C${cuentaPago.saldo.toFixed(2)}</span>
            </div>

            <form onSubmit={registrarPago} className="space-y-4">
              <label className="block text-sm">
                <span className="text-gray-600">Monto del pago (C$)</span>
                <input
                  type="number"
                  step="any"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className={`${estiloInput} mt-1`}
                  autoFocus
                />
              </label>

              <button
                type="button"
                onClick={() => setMonto(String(cuentaPago.saldo))}
                className="text-carne text-sm hover:underline"
              >
                Pagar el saldo completo
              </button>

              {error && (
                <p className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarPago}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-crema"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-carne hover:bg-vino text-white font-semibold transition"
                >
                  Guardar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Tarjeta({ icono: Icono, titulo, valor, rojo }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-red-50 text-carne flex items-center justify-center shrink-0">
        <Icono size={26} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className={`text-2xl font-bold ${rojo ? 'text-red-600' : ''}`}>{valor}</p>
      </div>
    </div>
  )
}