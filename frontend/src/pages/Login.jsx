import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, LogIn, MapPin } from 'lucide-react'
import carne from '../assets/carne.jpg'
import logo from '../assets/logo.png'
import { useAuth } from '../AuthContext'

export default function Login() {
  const [verClave, setVerClave] = useState(false)
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const entrar = (e) => {
    e.preventDefault()
    if (!usuario.trim() || !clave) return setError('Escribe tu usuario y contraseña.')
    if (login(usuario, clave)) {
      navigate('/dashboard')
    } else {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Panel de marca */}
      <div
        className="w-full md:w-2/5 h-80 md:h-auto relative overflow-hidden flex flex-col items-center text-white p-6 md:p-10 text-center"
        style={{ background: 'linear-gradient(180deg, #68070B, #3a0408)' }}
      >
        <img
          src={carne}
          alt=""
          className="absolute bottom-0 left-0 w-full h-1/2 md:h-3/5 object-cover"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent, black 35%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 35%)',
          }}
        />
        <div className="relative z-10 flex flex-col items-center md:mt-6">
          <img src={logo} alt="Logo" className="w-16 md:w-28" />
          <h1 className="font-serif text-2xl md:text-3xl mt-2 md:mt-4 tracking-wide">
            CARNES SAN MARTÍN
          </h1>
          <p className="text-oro tracking-[0.3em] text-xs md:text-sm mt-1">GOLD PREMIUM</p>
          <p className="font-serif italic text-lg md:text-2xl mt-3 md:mt-8">
            Tradición y calidad desde 1975
          </p>
          <div className="w-24 h-0.5 bg-oro mt-2 md:mt-3" />
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-16 relative">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="font-serif text-xl">Distribuidora</p>
            <h2 className="font-serif text-3xl font-bold text-vino">Carnes San Martín</h2>
            <p className="text-sm text-gray-500 mt-2">
              Sistema exclusivo para personal autorizado
            </p>
          </div>

          <form onSubmit={entrar} className="space-y-4">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 focus-within:border-oro">
              <User size={20} className="text-carne" />
              <input
                type="text"
                placeholder="Usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 focus-within:border-oro">
              <Lock size={20} className="text-carne" />
              <input
                type={verClave ? 'text' : 'password'}
                placeholder="Contraseña"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="w-full outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setVerClave(!verClave)}
                className="text-gray-400"
              >
                {verClave ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <p className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-carne hover:bg-vino text-white font-semibold rounded-lg py-3 transition"
            >
              <LogIn size={20} /> Iniciar Sesión
            </button>
          </form>
        </div>

        <p className="absolute bottom-4 flex items-center gap-1 text-xs text-gray-400">
          <MapPin size={14} /> Nandaime, Nicaragua
        </p>
      </div>
    </div>
  )
}