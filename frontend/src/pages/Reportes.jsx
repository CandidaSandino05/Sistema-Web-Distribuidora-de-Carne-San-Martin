import { useState } from 'react'
import {
  TrendingUp,
  Package,
  CircleDollarSign,
  AlertTriangle,
  Download,
  Printer,
  Wallet,
  Banknote,
  CreditCard,
  CheckCircle2,
  Users,
  Trophy,
  Clock,
} from 'lucide-react'

/* ------------------------- utilidades ------------------------- */

const fechaEnDias = (dias) => {
  const f = new Date()
  f.setDate(f.getDate() + dias)
  return f.toISOString().slice(0, 10)
}

const formatearFecha = (iso) => {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

const dinero = (n) =>
  `C$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const diasHasta = (iso) =>
  Math.round((new Date(iso + 'T00:00:00') - new Date(fechaEnDias(0) + 'T00:00:00')) / 86400000)

const nombreDia = (iso) => {
  const t = new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' })
  return t.replace('.', '').replace(/^./, (c) => c.toUpperCase())
}

// Descarga una tabla como archivo CSV (se abre bien en Excel en español)
// Usa punto y coma como separador y deja los números como números
const descargarCSV = (nombre, columnas, filas) => {
  const esc = (v) => (typeof v === 'number' ? String(v) : `"${String(v).replace(/"/g, '""')}"`)
  const texto = [columnas, ...filas].map((fila) => fila.map(esc).join(';')).join('\r\n')
  const blob = new Blob(['\uFEFF' + texto], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------- datos de ejemplo ------------------------- */

const ventas = [
  { fecha: fechaEnDias(0), cliente: 'Asados las Primas', tipo: 'Contado', total: 275 },
  { fecha: fechaEnDias(0), cliente: 'Casa Sola', tipo: 'Crédito', total: 504 },
  { fecha: fechaEnDias(-1), cliente: 'Asados Ileanas', tipo: 'Contado', total: 190 },
  { fecha: fechaEnDias(-2), cliente: 'Asados Jehova', tipo: 'Contado', total: 225 },
  { fecha: fechaEnDias(-4), cliente: 'Asados las Primas', tipo: 'Crédito', total: 310 },
  { fecha: fechaEnDias(-5), cliente: 'Asados Ileanas', tipo: 'Contado', total: 320 },
  { fecha: fechaEnDias(-9), cliente: 'Casa Sola', tipo: 'Contado', total: 260 },
  { fecha: fechaEnDias(-12), cliente: 'Asados las Primas', tipo: 'Crédito', total: 410 },
  { fecha: fechaEnDias(-15), cliente: 'Asados Jehova', tipo: 'Contado', total: 150 },
  { fecha: fechaEnDias(-20), cliente: 'Casa Sola', tipo: 'Contado', total: 180 },
  { fecha: fechaEnDias(-24), cliente: 'Asados Ileanas', tipo: 'Crédito', total: 275 },
  { fecha: fechaEnDias(-27), cliente: 'Asados Jehova', tipo: 'Crédito', total: 350 },
]

const productos = [
  { nombre: 'Corbata', stock: 320, minimo: 100, vendidas: 480 },
  { nombre: 'Brocheta', stock: 85, minimo: 100, vendidas: 620 },
  { nombre: 'Tortas', stock: 540, minimo: 200, vendidas: 900 },
  { nombre: 'Lomo', stock: 210, minimo: 80, vendidas: 350 },
  { nombre: 'Costilla de res', stock: 60, minimo: 70, vendidas: 210 },
]

const cuentas = [
  { cliente: 'Asados las Primas', saldo: 275, vence: fechaEnDias(-5) },
  { cliente: 'Casa Sola', saldo: 354, vence: fechaEnDias(4) },
  { cliente: 'Asados Jehova', saldo: 225, vence: fechaEnDias(20) },
  { cliente: 'Asados Ileanas', saldo: 0, vence: fechaEnDias(-10) },
]

const periodos = {
  Diario: { dias: 1, texto: 'hoy' },
  Semanal: { dias: 7, texto: 'los últimos 7 días' },
  Mensual: { dias: 30, texto: 'los últimos 30 días' },
}

/* ------------------------- pantalla principal ------------------------- */

export default function Reportes() {
  const [pestana, setPestana] = useState('ventas')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-vino font-bold">Reportes</h1>
        <p className="text-gray-500 text-sm">Mira cómo va tu negocio de un vistazo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-imprimir">
        {[
          { id: 'ventas', texto: 'Ventas', ayuda: '¿Cuánto vendí?', icono: TrendingUp },
          { id: 'inventario', texto: 'Inventario', ayuda: '¿Qué tengo en bodega?', icono: Package },
          { id: 'cuentas', texto: 'Cuentas por Cobrar', ayuda: '¿Quién me debe?', icono: CircleDollarSign },
        ].map(({ id, texto, ayuda, icono: Icono }) => {
          const activa = pestana === id
          return (
            <button
              key={id}
              onClick={() => setPestana(id)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
                activa
                  ? 'bg-vino text-white border-vino shadow-md'
                  : 'bg-white text-tinta border-gray-200 hover:border-oro'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  activa ? 'bg-white/15 text-oro' : 'bg-red-50 text-carne'
                }`}
              >
                <Icono size={22} />
              </div>
              <div>
                <p className="font-semibold">{texto}</p>
                <p className={`text-xs ${activa ? 'text-white/70' : 'text-gray-500'}`}>{ayuda}</p>
              </div>
            </button>
          )
        })}
      </div>

      {pestana === 'ventas' && <ReporteVentas />}
      {pestana === 'inventario' && <ReporteInventario />}
      {pestana === 'cuentas' && <ReporteCuentas />}
    </div>
  )
}

/* ------------------------- VENTAS ------------------------- */

function ReporteVentas() {
  const [periodo, setPeriodo] = useState('Semanal')

  const numDias = periodos[periodo].dias
  const desde = fechaEnDias(-(numDias - 1))
  const filtradas = ventas.filter((v) => v.fecha >= desde)

  const total = filtradas.reduce((s, v) => s + v.total, 0)
  const contado = filtradas.filter((v) => v.tipo === 'Contado').reduce((s, v) => s + v.total, 0)
  const credito = total - contado
  const pctCredito = total ? Math.round((credito / total) * 100) : 0

  const porDia = Array.from({ length: numDias }, (_, i) => {
    const fecha = fechaEnDias(-(numDias - 1) + i)
    const del = filtradas.filter((v) => v.fecha === fecha)
    return {
      fecha,
      contado: del.filter((v) => v.tipo === 'Contado').reduce((s, v) => s + v.total, 0),
      credito: del.filter((v) => v.tipo === 'Crédito').reduce((s, v) => s + v.total, 0),
    }
  }).map((d) => ({ ...d, suma: d.contado + d.credito }))

  const maximo = Math.max(...porDia.map((d) => d.suma), 1)
  const mejorDia = porDia.reduce((a, b) => (b.suma > a.suma ? b : a), porDia[0])

  const porCliente = Object.entries(
    filtradas.reduce((acc, v) => ({ ...acc, [v.cliente]: (acc[v.cliente] || 0) + v.total }), {})
  ).sort((a, b) => b[1] - a[1])

  // Para la pantalla (con formato C$) y para el CSV (con números)
  const columnas = ['Fecha', 'Cliente', 'Tipo', 'Total']
  const filasPantalla = filtradas.map((v) => [formatearFecha(v.fecha), v.cliente, v.tipo, dinero(v.total)])
  const columnasCSV = ['Fecha', 'Cliente', 'Tipo', 'Total (C$)']
  const filasCSV = filtradas.map((v) => [formatearFecha(v.fecha), v.cliente, v.tipo, v.total])

  return (
    <div className="space-y-6">
      {/* Selector de período + exportar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1 no-imprimir">
          {Object.keys(periodos).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                periodo === p ? 'bg-carne text-white shadow' : 'text-gray-600 hover:bg-crema'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <Exportar
          nombre={`reporte-ventas-${periodo.toLowerCase()}`}
          columnas={columnasCSV}
          filas={filasCSV}
        />
      </div>

      {/* Resumen en una frase */}
      <Resumen>
        {total > 0 ? (
          <>
            En {periodos[periodo].texto} vendiste <b>{dinero(total)}</b> en {filtradas.length}{' '}
            {filtradas.length === 1 ? 'venta' : 'ventas'}.{' '}
            {numDias > 1 && mejorDia.suma > 0 && (
              <>
                Tu mejor día fue el <b>{formatearFecha(mejorDia.fecha)}</b> con {dinero(mejorDia.suma)}.
              </>
            )}{' '}
            {pctCredito > 0 && <>El {pctCredito}% de lo vendido quedó a crédito.</>}
          </>
        ) : (
          <>No hubo ventas en {periodos[periodo].texto}.</>
        )}
      </Resumen>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tarjeta icono={Wallet} color="vino" titulo="Total vendido" valor={dinero(total)} nota={`${filtradas.length} ventas`} />
        <Tarjeta icono={Banknote} color="verde" titulo="Cobrado al contado" valor={dinero(contado)} nota="Dinero que ya entró" />
        <Tarjeta icono={CreditCard} color="oro" titulo="Vendido a crédito" valor={dinero(credito)} nota="Pendiente de cobro" />
      </div>

      {/* Gráfico */}
      {numDias > 1 && (
        <Seccion titulo="Ventas por día" icono={TrendingUp}>
          <div className="flex items-end gap-1 sm:gap-2 h-56">
            {porDia.map((d) => {
              const alto = (d.suma / maximo) * 82
              return (
                <div
                  key={d.fecha}
                  className="flex-1 h-full flex flex-col justify-end items-center min-w-0"
                  title={`${formatearFecha(d.fecha)} — Contado: ${dinero(d.contado)} · Crédito: ${dinero(d.credito)}`}
                >
                  {numDias <= 7 && d.suma > 0 && (
                    <span className="text-[11px] font-semibold text-tinta mb-1">{Math.round(d.suma)}</span>
                  )}
                  <div
                    className="w-full flex flex-col justify-end rounded-t-md overflow-hidden"
                    style={{ height: `${alto}%` }}
                  >
                    {d.credito > 0 && <div className="bg-oro" style={{ height: `${(d.credito / d.suma) * 100}%` }} />}
                    {d.contado > 0 && <div className="bg-carne" style={{ height: `${(d.contado / d.suma) * 100}%` }} />}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Etiquetas de los días */}
          <div className="flex gap-1 sm:gap-2 mt-2 border-t border-gray-200 pt-2">
            {porDia.map((d, i) => {
              const esHoy = i === porDia.length - 1
              const mostrar = numDias <= 7 || i % 5 === 0 || esHoy
              return (
                <div key={d.fecha} className="flex-1 min-w-0 text-center">
                  {mostrar && (
                    <>
                      <p className={`text-xs ${esHoy ? 'font-bold text-vino' : 'text-gray-500'}`}>
                        {numDias <= 7 ? (esHoy ? 'Hoy' : nombreDia(d.fecha)) : d.fecha.slice(8)}
                      </p>
                      {numDias <= 7 && (
                        <p className="text-[10px] text-gray-400">
                          {d.fecha.slice(8)}/{d.fecha.slice(5, 7)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex gap-5 mt-4 text-xs text-gray-600">
            <Leyenda color="bg-carne" texto="Contado" />
            <Leyenda color="bg-oro" texto="Crédito" />
          </div>
        </Seccion>
      )}

      {/* Mejores clientes */}
      <Seccion titulo="Tus mejores clientes" icono={Users}>
        {porCliente.length === 0 && <p className="text-gray-400 text-sm">Sin ventas en este período.</p>}
        <div className="space-y-4">
          {porCliente.map(([cliente, suma], i) => (
            <Ranking
              key={cliente}
              posicion={i + 1}
              etiqueta={cliente}
              valor={suma}
              maximo={porCliente[0][1]}
              texto={dinero(suma)}
            />
          ))}
        </div>
      </Seccion>

      {/* Detalle */}
      <Tabla
        titulo={`Detalle de ventas (${filtradas.length})`}
        columnas={columnas}
        filas={filasPantalla}
        vacio="No hay ventas en este período."
        etiquetas={{
          2: (v) => (v === 'Crédito' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'),
        }}
      />
    </div>
  )
}

/* ------------------------- INVENTARIO ------------------------- */

function ReporteInventario() {
  const bajos = productos.filter((p) => p.stock <= p.minimo)
  const masVendidos = [...productos].sort((a, b) => b.vendidas - a.vendidas)

  const columnasCSV = ['Producto', 'Stock (lb)', 'Mínimo (lb)', 'Vendidas (lb)', 'Estado']
  const filasCSV = productos.map((p) => [
    p.nombre,
    p.stock,
    p.minimo,
    p.vendidas,
    p.stock <= p.minimo ? 'Stock bajo' : 'Disponible',
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Exportar nombre="reporte-inventario" columnas={columnasCSV} filas={filasCSV} />
      </div>

      <Resumen alerta={bajos.length > 0}>
        {bajos.length > 0 ? (
          <>
            Tienes <b>{bajos.length}</b> {bajos.length === 1 ? 'producto' : 'productos'} con stock bajo:{' '}
            <b>{bajos.map((p) => p.nombre).join(', ')}</b>. Conviene hacer una compra pronto.
          </>
        ) : (
          <>Todos tus productos tienen existencias suficientes.</>
        )}
      </Resumen>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tarjeta icono={Package} color="vino" titulo="Productos" valor={productos.length} nota="en el catálogo" />
        <Tarjeta icono={CheckCircle2} color="verde" titulo="Con existencias" valor={productos.length - bajos.length} nota="todo en orden" />
        <Tarjeta icono={AlertTriangle} color="rojo" titulo="Stock bajo" valor={bajos.length} nota="hay que reponer" />
      </div>

      <Seccion titulo="Existencias por producto" icono={Package}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {productos.map((p) => {
            const bajo = p.stock <= p.minimo
            const pct = Math.min((p.stock / (p.minimo * 2)) * 100, 100)
            const diferencia = Math.abs(p.stock - p.minimo)
            return (
              <div
                key={p.nombre}
                className={`rounded-xl border p-4 ${bajo ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold">{p.nombre}</p>
                  <Etiqueta
                    texto={bajo ? 'Stock bajo' : 'Disponible'}
                    color={bajo ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                  />
                </div>
                <p className="text-2xl font-bold">
                  {p.stock} <span className="text-sm font-normal text-gray-500">lb</span>
                </p>

                {/* barra con la marca del mínimo */}
                <div className="relative mt-3 mb-1">
                  <div className="h-3 bg-crema rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bajo ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="absolute top-[-4px] bottom-[-4px] w-0.5 bg-tinta" style={{ left: '50%' }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span className="font-medium text-tinta">Mínimo: {p.minimo} lb</span>
                  <span>{p.minimo * 2}+</span>
                </div>

                <p className={`text-sm mt-2 ${bajo ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
                  {bajo ? `Faltan ${diferencia} lb para llegar al mínimo` : `${diferencia} lb por encima del mínimo`}
                </p>
              </div>
            )
          })}
        </div>
      </Seccion>

      <Seccion titulo="Productos más vendidos" icono={Trophy}>
        <div className="space-y-4">
          {masVendidos.map((p, i) => (
            <Ranking
              key={p.nombre}
              posicion={i + 1}
              etiqueta={p.nombre}
              valor={p.vendidas}
              maximo={masVendidos[0].vendidas}
              texto={`${p.vendidas} lb`}
            />
          ))}
        </div>
      </Seccion>
    </div>
  )
}

/* ------------------------- CUENTAS POR COBRAR ------------------------- */

function ReporteCuentas() {
  const saldoTotal = cuentas.reduce((s, c) => s + c.saldo, 0)
  const morosos = cuentas.filter((c) => c.saldo > 0 && diasHasta(c.vence) < 0)
  const saldoMoroso = morosos.reduce((s, c) => s + c.saldo, 0)
  const alDia = cuentas.filter((c) => c.saldo > 0 && diasHasta(c.vence) >= 0)

  const estadoDe = (c) => {
    const d = diasHasta(c.vence)
    if (c.saldo <= 0)
      return { texto: 'Pagada', detalle: 'Sin deuda', borde: 'border-green-300', badge: 'bg-green-100 text-green-700' }
    if (d < 0)
      return {
        texto: 'Vencida',
        detalle: `Venció hace ${Math.abs(d)} ${Math.abs(d) === 1 ? 'día' : 'días'}`,
        borde: 'border-red-300 bg-red-50/50',
        badge: 'bg-red-100 text-red-700',
      }
    if (d <= 7)
      return {
        texto: 'Por vencer',
        detalle: d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}`,
        borde: 'border-amber-300 bg-amber-50/50',
        badge: 'bg-amber-100 text-amber-700',
      }
    return { texto: 'Al día', detalle: `Vence en ${d} días`, borde: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' }
  }

  const columnasCSV = ['Cliente', 'Saldo pendiente (C$)', 'Vence', 'Estado']
  const filasCSV = cuentas.map((c) => [c.cliente, c.saldo, formatearFecha(c.vence), estadoDe(c).texto])

  const ordenadas = [...cuentas].sort((a, b) => b.saldo - a.saldo)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Exportar nombre="reporte-cuentas-por-cobrar" columnas={columnasCSV} filas={filasCSV} />
      </div>

      <Resumen alerta={morosos.length > 0}>
        {morosos.length > 0 ? (
          <>
            Te deben <b>{dinero(saldoTotal)}</b> en total. De eso, <b>{dinero(saldoMoroso)}</b> ya está vencido:{' '}
            <b>{morosos.map((c) => c.cliente).join(', ')}</b>.
          </>
        ) : saldoTotal > 0 ? (
          <>
            Te deben <b>{dinero(saldoTotal)}</b> y ningún cliente está en mora.
          </>
        ) : (
          <>No tienes cuentas pendientes de cobro.</>
        )}
      </Resumen>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tarjeta icono={Wallet} color="vino" titulo="Te deben en total" valor={dinero(saldoTotal)} nota={`${alDia.length + morosos.length} cuentas abiertas`} />
        <Tarjeta icono={Clock} color="rojo" titulo="Clientes morosos" valor={morosos.length} nota="con pago vencido" />
        <Tarjeta icono={AlertTriangle} color="rojo" titulo="Saldo en mora" valor={dinero(saldoMoroso)} nota="urge cobrarlo" />
      </div>

      <Seccion titulo="Estado de cada cliente" icono={Users}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ordenadas.map((c) => {
            const e = estadoDe(c)
            return (
              <div key={c.cliente} className={`rounded-xl border-2 p-4 ${e.borde}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{c.cliente}</p>
                  <Etiqueta texto={e.texto} color={e.badge} />
                </div>
                <p className="text-2xl font-bold">{dinero(c.saldo)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {e.detalle} · {formatearFecha(c.vence)}
                </p>
              </div>
            )
          })}
        </div>
      </Seccion>
    </div>
  )
}

/* ------------------------- piezas compartidas ------------------------- */

const colores = {
  vino: { caja: 'bg-red-50 text-carne', valor: 'text-vino' },
  verde: { caja: 'bg-green-50 text-green-600', valor: 'text-green-700' },
  oro: { caja: 'bg-amber-50 text-oro', valor: 'text-amber-700' },
  rojo: { caja: 'bg-red-50 text-red-600', valor: 'text-red-600' },
}

function Tarjeta({ icono: Icono, titulo, valor, nota, color = 'vino' }) {
  const c = colores[color]
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${c.caja}`}>
        <Icono size={26} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className={`text-2xl font-bold truncate ${c.valor}`}>{valor}</p>
        {nota && <p className="text-xs text-gray-400">{nota}</p>}
      </div>
    </div>
  )
}

function Resumen({ children, alerta }) {
  return (
    <div
      className={`rounded-xl p-4 text-sm border-l-4 ${
        alerta ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-oro text-tinta shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {alerta && <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-600" />}
        <p className="leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

function Seccion({ titulo, icono: Icono, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="font-semibold text-lg mb-5 flex items-center gap-2">
        <Icono size={20} className="text-carne" /> {titulo}
      </h2>
      {children}
    </div>
  )
}

function Leyenda({ color, texto }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-sm ${color}`} /> {texto}
    </span>
  )
}

function Ranking({ posicion, etiqueta, valor, maximo, texto }) {
  const medalla =
    posicion === 1
      ? 'bg-oro text-white'
      : posicion === 2
      ? 'bg-gray-300 text-gray-700'
      : posicion === 3
      ? 'bg-amber-700/80 text-white'
      : 'bg-crema text-gray-500'
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${medalla}`}>
        {posicion}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium truncate">{etiqueta}</span>
          <span className="font-semibold">{texto}</span>
        </div>
        <div className="h-2.5 bg-crema rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${posicion === 1 ? 'bg-oro' : 'bg-carne'}`}
            style={{ width: `${(valor / maximo) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Etiqueta({ texto, color }) {
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${color}`}>{texto}</span>
}

function Exportar({ nombre, columnas, filas }) {
  return (
    <div className="flex gap-2 no-imprimir">
      <button
        onClick={() => descargarCSV(nombre, columnas, filas)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-crema transition"
      >
        <Download size={18} /> Descargar CSV
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-carne hover:bg-vino text-white text-sm font-semibold transition"
      >
        <Printer size={18} /> Imprimir / PDF
      </button>
    </div>
  )
}

function Tabla({ titulo, columnas, filas, vacio = 'Sin datos.', etiquetas = {} }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="font-semibold text-lg mb-4">{titulo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-crema">
            <tr>
              {columnas.map((c) => (
                <th key={c} className="px-3 py-2">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={i} className="border-t border-gray-100">
                {fila.map((celda, j) => (
                  <td key={j} className="px-3 py-3">
                    {etiquetas[j] ? <Etiqueta texto={celda} color={etiquetas[j](celda)} /> : celda}
                  </td>
                ))}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={columnas.length} className="px-3 py-8 text-center text-gray-400">
                  {vacio}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}