import axios from 'axios'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import netAlerteMark from '../assets/brand/netalerte-mark-white.svg'
import { COLORS, RADIUS, SHADOWS, TRANSLATIONS } from '../core/theme'
import api from '../utils/api'
import type { LoginResponse } from '../types'

const t = TRANSLATIONS.fr

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password })
      localStorage.setItem('token', response.data.accessToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError(t.loginError)
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center"
      style={{ background: COLORS.bgPage }}
    >
      <div
        className="w-[400px] p-8"
        style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-[60px] w-[60px] items-center justify-center"
            style={{ background: COLORS.primary, borderRadius: RADIUS.md }}
          >
            <img src={netAlerteMark} alt="NetAlerte CM" width={34} height={34} />
          </div>
          <h1 className="text-[20px] font-semibold" style={{ color: COLORS.textDark }}>
            {t.loginTitle}
          </h1>
          <p className="mt-1 text-sm" style={{ color: COLORS.textLight }}>
            {t.loginSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium" style={{ color: COLORS.textMedium }}>
              {t.email}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-3 py-2 text-sm transition-colors focus:outline-none"
              style={{ border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm, color: COLORS.textDark }}
              onFocus={(event) => (event.currentTarget.style.borderColor = COLORS.primary)}
              onBlur={(event) => (event.currentTarget.style.borderColor = COLORS.border)}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium" style={{ color: COLORS.textMedium }}>
              {t.password}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-3 py-2 text-sm transition-colors focus:outline-none"
              style={{ border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm, color: COLORS.textDark }}
              onFocus={(event) => (event.currentTarget.style.borderColor = COLORS.primary)}
              onBlur={(event) => (event.currentTarget.style.borderColor = COLORS.border)}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: COLORS.danger }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-70"
            style={{ background: COLORS.primary, color: COLORS.textWhite, borderRadius: RADIUS.sm }}
          >
            {loading && (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
              </svg>
            )}
            {t.loginBtn.toUpperCase()}
          </button>
        </form>
      </div>
    </div>
  )
}
