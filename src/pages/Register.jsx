import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Waypoints,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  TriangleAlert,
  Copy,
  Check,
  CircleCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import QRPlaceholder from '../components/QRPlaceholder'

const DEFAULT_WAREHOUSE = {
  id: 'CN-GZ-01',
  name: 'Guangzhou Warehouse',
  address: '广东省广州市白云区京广铁路装卸区 8号仓库',
}

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('form') // 'form' | 'success' | 'pending'
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [customerId, setCustomerId] = useState('')

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.phone || !form.email || !form.password) {
      setError('សូមបំពេញគ្រប់ចន្លោះទាំងអស់')
      return
    }
    if (form.password.length < 6) {
      setError('Password ត្រូវមានយ៉ាងតិច 6 តួអក្សរ')
      return
    }
    if (form.password !== form.confirm) {
      setError('Password និង Confirm Password មិនត្រូវគ្នា')
      return
    }

    setSubmitting(true)
    const result = await signUp({
      name: form.name,
      phone: form.phone,
      email: form.email,
      password: form.password,
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error.message || 'មានបញ្ហាក្នុងការចុះឈ្មោះ')
      return
    }
    if (result.pendingConfirmation) {
      setStep('pending')
      return
    }

    setCustomerId(result.customerId)
    setStep('success')
  }

  const recipient = `${form.name} ${customerId}`

  async function copyAddress() {
    const text = [
      `Recipient: ${recipient}`,
      `Warehouse: ${DEFAULT_WAREHOUSE.name}`,
      `Phone: +86 XXX XXX XXXX`,
      `Address: ${DEFAULT_WAREHOUSE.address}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('មិនអាចចម្លងបានទេ — សូមចម្លងដោយដៃ')
    }
  }

  if (step === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist-50 px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-signal-blue/10 text-signal-blue flex items-center justify-center mb-4 mx-auto">
            <CircleCheck size={24} />
          </div>
          <h1 className="font-display font-bold text-xl text-ink-900">
            សូមបញ្ជាក់ Email របស់អ្នក
          </h1>
          <p className="text-sm text-ink-600/55 mt-2 leading-relaxed">
            យើងបានផ្ញើលីង Confirm ទៅកាន់ <span className="text-ink-900 font-medium">{form.email}</span>។
            ចុចលីងនោះ រួច Login ចូលវិញ ដើម្បីទទួលបាន Customer ID និងអាសយដ្ឋាន Warehouse
            របស់អ្នក។
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-signal-blue hover:underline mt-6"
          >
            ទៅកាន់ទំព័រ Login
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-signal-teal/10 text-signal-teal flex items-center justify-center mb-3">
              <CircleCheck size={24} />
            </div>
            <h1 className="font-display font-bold text-xl text-ink-900">ចុះឈ្មោះជោគជ័យ!</h1>
            <p className="text-sm text-ink-600/55 mt-1">
              គណនីរបស់អ្នកត្រូវបានបង្កើត — នេះជា Customer ID និងអាសយដ្ឋាន China Warehouse របស់អ្នក
            </p>
          </div>

          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5 flex items-center gap-4">
            <QRPlaceholder seed={customerId} />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                Customer ID
              </div>
              <div className="font-display font-extrabold text-2xl text-ink-900 tracking-tight">
                {customerId}
              </div>
              <div className="text-sm text-ink-600/60 truncate mt-0.5">{form.name}</div>
            </div>
          </div>

          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-sm text-ink-900">
                {DEFAULT_WAREHOUSE.name}
              </h2>
              <span className="text-[11px] font-medium bg-signal-blue/10 text-signal-blue px-2 py-0.5 rounded-sm">
                {DEFAULT_WAREHOUSE.id}
              </span>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                  Recipient
                </dt>
                <dd className="font-medium text-ink-900 mt-0.5">{recipient}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                  Phone
                </dt>
                <dd className="text-ink-900 mt-0.5">+86 XXX XXX XXXX</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                  Address
                </dt>
                <dd className="text-ink-900 mt-0.5">{DEFAULT_WAREHOUSE.address}</dd>
              </div>
            </dl>

            <button
              onClick={copyAddress}
              className="w-full flex items-center justify-center gap-1.5 mt-4 border border-mist-200 text-sm font-medium text-ink-800 py-2.5 rounded-md hover:bg-mist-50 transition-colors"
            >
              {copied ? <Check size={15} className="text-signal-teal" /> : <Copy size={15} />}
              {copied ? 'បានចម្លង!' : 'Copy Address'}
            </button>
            <p className="text-xs text-ink-600/45 mt-2 text-center">
              យក Address នេះទៅ Paste ក្នុង Taobao, 1688, Tmall, Pinduoduo ឬ JD
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-1.5 bg-signal-blue text-white text-sm font-medium py-2.5 rounded-md hover:bg-signal-blue/90 transition-colors mt-5"
          >
            ទៅកាន់ Dashboard
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-sm bg-signal-blue flex items-center justify-center">
            <Waypoints size={18} className="text-white" />
          </div>
          <div className="font-display font-extrabold text-ink-900">Cargo Bridge</div>
        </div>

        <h1 className="font-display font-bold text-2xl text-ink-900">ចុះឈ្មោះគណនីថ្មី</h1>
        <p className="text-sm text-ink-600/55 mt-1.5">
          បង្កើតគណនី Customer ដើម្បីទទួលបាន Customer ID និងអាសយដ្ឋាន China Warehouse ផ្ទាល់ខ្លួន។
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">ឈ្មោះពេញ / ឈ្មោះហាង</label>
            <input
              value={form.name}
              onChange={update('name')}
              placeholder="Sothon Shop"
              className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">លេខទូរស័ព្ទ</label>
            <input
              value={form.phone}
              onChange={update('phone')}
              placeholder="012 345 678"
              className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@email.com"
              className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                placeholder="••••••••"
                className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-signal-blue transition-colors"
                autoComplete="new-password"
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

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirm}
              onChange={update('confirm')}
              placeholder="••••••••"
              className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
              autoComplete="new-password"
            />
          </div>

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
            {submitting ? 'កំពុងបង្កើតគណនី...' : 'ចុះឈ្មោះ'}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-ink-600/60 hover:text-ink-900 mt-6"
        >
          <ArrowLeft size={14} />
          មានគណនីរួចហើយ? ចូលប្រើប្រាស់
        </Link>
      </div>
    </div>
  )
}
