import {
    Package,
    ShoppingCart,
    Users,
    CircleDollarSign,
    ArrowUp,
    BarChart3,
    ArrowRight,
} from 'lucide-react'
import carne from '../assets/carne.jpg'

const indicadores = [
    { titulo: 'Total Productos', valor: '1,284', cambio: '+12%', icono: Package },
    { titulo: 'Ventas Hoy', valor: 'C$ 45,230', cambio: '+8%', icono: ShoppingCart },
    { titulo: 'Clientes Activos', valor: '86', cambio: '+5%', icono: Users },
    { titulo: 'Cuentas por Cobrar', valor: 'C$ 12,450', cambio: '+3%', icono: CircleDollarSign },
]

const ventas = [
    { cliente: 'Asados las Primas', producto: 'Corbata', cantidad: '50 lb', total: 'C$275.00', fecha: '12/08/2026' },
    { cliente: 'Casa Sola', producto: 'Brocheta', cantidad: '120 lb', total: 'C$504.00', fecha: '12/08/2026' },
    { cliente: 'Asados Jehova', producto: 'Tortas', cantidad: '500 lb', total: 'C$225.00', fecha: '12/08/2026' },
    { cliente: 'Asados Ileanas', producto: 'Lomo', cantidad: '450 lb', total: 'C$320.00', fecha: '12/08/2026' },
]

export default function Dashboard() {
    return (
        <div className="space-y-6">
            {/* Banner */}
            <div
                className="relative rounded-xl overflow-hidden min-h-56 md:h-64 text-white"
                style={{ background: 'linear-gradient(90deg, #1a0a0a, #3a0408)' }}
            >
                <img
                    src={carne}
                    alt=""
                    className="absolute right-0 top-0 h-full w-full md:w-3/5 object-cover object-center opacity-60 md:opacity-100"
                    style={{
                        maskImage: 'linear-gradient(to right, transparent, black 30%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)',
                    }}
                />
                <div className="relative z-10 p-6 md:p-10">
                    <p className="text-oro text-xs md:text-sm tracking-widest">BIENVENIDO AL SISTEMA</p>
                    <h1 className="font-serif text-3xl md:text-5xl font-bold mt-2">CARNES SAN MARTÍN</h1>
                    <p className="mt-3 text-white/90 text-base md:text-lg">
                        Calidad, frescura y confianza en cada corte.
                    </p>
                    <div className="w-16 h-0.5 bg-oro mt-4" />
                </div>
            </div>

            {/* Tarjetas de indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {indicadores.map(({ titulo, valor, cambio, icono: Icono }) => (
                    <div key={titulo} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-red-50 text-carne flex items-center justify-center shrink-0">
                            <Icono size={26} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{titulo}</p>
                            <p className="text-2xl font-bold">{valor}</p>
                            <p className="text-sm text-green-600 flex items-center gap-1">
                                <ArrowUp size={14} /> {cambio}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabla de últimas ventas */}
            <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <BarChart3 size={20} className="text-carne" /> Últimas Ventas Registradas
                    </h2>
                    <a href="/ventas" className="text-carne text-sm flex items-center gap-1 hover:underline">
                        Ver todas <ArrowRight size={14} />
                    </a>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-crema">
                            <tr>
                                <th className="px-3 py-2">Cliente</th>
                                <th className="px-3 py-2">Producto</th>
                                <th className="px-3 py-2">Cantidad</th>
                                <th className="px-3 py-2">Total</th>
                                <th className="px-3 py-2">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map((v, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                    <td className="px-3 py-3">{v.cliente}</td>
                                    <td className="px-3 py-3">{v.producto}</td>
                                    <td className="px-3 py-3">{v.cantidad}</td>
                                    <td className="px-3 py-3">{v.total}</td>
                                    <td className="px-3 py-3">{v.fecha}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}