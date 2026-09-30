import { useState } from 'react'
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Waypoints, ArrowRight, TriangleAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const STAGE_DOTS = ['🇨🇳', '🚢', '🇰🇭']

export default function Login() {
  const { user, login, isMock } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('សូមបញ្ចូល Email និង Password')
      return
    }
    setSubmitting(true)
    const { error } = await login(email, password)
    setSubmitting(false)
    if (error) {
      setError(error.message || 'Email ឬ Password មិនត្រឹមត្រូវ')
      return
    }
    navigate(location.state?.from?.pathname || '/', { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-mist-50">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-ink-900 text-white flex-col justify-between p-10 xl:p-14">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-sm bg-signal-blue flex items-center justify-center">
            <Waypoints size={20} />
          </div>
          <div className="font-display font-extrabold text-lg tracking-tight">Cargo Bridge</div>
        </div>

        <div>
          <h1 className="font-display font-extrabold text-3xl xl:text-4xl leading-tight">
            គ្រប់គ្រងទំនិញឆ្លងប្រទេស
            <br />
            ពី China ដល់ Cambodia
          </h1>
          <p className="text-mist-100/50 mt-4 text-sm max-w-sm leading-relaxed">
            តាមដាន TK, Shipment និង Container ពី Inbound Origin រហូតដល់ Delivery
            ក្នុងប្រព័ន្ធតែមួយ។
          </p>

          <div className="flex items-center gap-3 mt-8">
            {STAGE_DOTS.map((flag, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm">
                  {flag}
                </div>
                {i < STAGE_DOTS.length - 1 && <div className="w-8 h-px bg-white/15" />}
              </div>
            ))}
          </div>
        </div>

        <div className="text-mist-100/35 text-xs">© 2026 Cargo Bridge Logistics</div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-sm bg-signal-blue flex items-center justify-center">
              <Waypoints size={18} className="text-white" />
            </div>
            <div className="font-display font-extrabold text-ink-900">Cargo Bridge</div>
          </div>

          <h2 className="font-display font-bold text-2xl text-ink-900">ចូលប្រើប្រាស់</h2>
          <p className="text-sm text-ink-600/55 mt-1.5">
            បញ្ចូលគណនីរបស់អ្នកដើម្បីចូលទៅកាន់ប្រព័ន្ធគ្រប់គ្រង។
          </p>

          {isMock && (
            <div className="mt-5 flex items-start gap-2 bg-signal-amber/10 text-[#8A5A12] text-xs rounded-md px-3 py-2.5 leading-relaxed">
              <TriangleAlert size={14} className="shrink-0 mt-0.5" />
              <span>
                Demo mode — Supabase មិនទាន់ភ្ជាប់នៅឡើយ។ បញ្ចូល Email/Password ណាមួយ
                ដើម្បីចូលសាកល្បង។
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cargobridge.com"
                className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-ink-700">Password</label>
                <button
                  type="button"
                  className="text-xs text-signal-blue hover:underline"
                  onClick={() => setError('ទាក់ទង Admin ដើម្បី Reset Password')}
                >
                  ភ្លេច Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-signal-blue transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600/40 hover:text-ink-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-700 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded-sm border-mist-200 text-signal-blue focus:ring-signal-blue"
              />
              ចងចាំខ្ញុំ
            </label>

            {error && (
              <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
                <TriangleAlert size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 bg-signal-blue text-white text-sm font-medium py-2.5 rounded-md hover:bg-signal-blue/90 transition-colors disabled:opacity-60"
            >
              {submitting ? 'កំពុងចូល...' : 'ចូលប្រើប្រាស់'}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-xs text-ink-600/45 mt-6">
            មិនទាន់មានគណនី?{' '}
            <Link to="/register" className="text-signal-blue hover:underline">
              ចុះឈ្មោះថ្មី
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
