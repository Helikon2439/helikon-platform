import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Invalid email or password')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-['Bebas_Neue'] text-4xl tracking-widest text-[#d4a84b] mb-1">⬡ HELIKON</div>
          <div className="text-xs text-slate-500 tracking-[0.25em] uppercase">Group Command System</div>
        </div>

        {/* Card */}
        <div className="bg-[#0c0e14] border border-[#1e2640] rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#1e2640] bg-[#111420]">
            <h1 className="font-['Bebas_Neue'] text-xl tracking-widest text-white">SIGN IN</h1>
            <p className="text-xs text-slate-500 mt-1">Enter your credentials to access the platform</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 tracking-[0.2em] uppercase">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[#111420] border border-[#1e2640] text-white text-sm px-3 py-2.5 rounded-md outline-none focus:border-[#d4a84b] transition-colors"
                placeholder="you@helikon.co.zw"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 tracking-[0.2em] uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#111420] border border-[#1e2640] text-white text-sm px-3 py-2.5 rounded-md outline-none focus:border-[#d4a84b] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d4a84b] hover:bg-[#f0c96a] text-[#07080c] font-semibold text-xs tracking-widest uppercase py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          helikon.co.zw · Powered by Helikon Platform
        </p>
      </div>
    </div>
  )
}
