import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import netAlerteMark from '../assets/brand/netalerte-mark-white.svg'
import { COLORS, ISSUE_CONFIG, OPERATOR_CONFIG, RADIUS, SHADOWS, TRANSLATIONS } from '../core/theme'
import api from '../utils/api'
import type { ApiIncident, ApiReport, AuthUser, IncidentType, Operator } from '../types'

const t = TRANSLATIONS.fr
const OPERATORS: Operator[] = ['MTN', 'Orange', 'Camtel']
const ISSUE_TYPES = Object.keys(ISSUE_CONFIG) as IncidentType[]

// GET /v1/reports pagine (200 max/page) et n'a pas de filtre par date : ce
// tableau de bord travaille sur les REPORTS_SAMPLE_LIMIT signalements les
// plus récents, pas sur l'historique complet. C'est explicitement indiqué
// dans l'UI plutôt que de laisser croire à une vue exhaustive.
const REPORTS_SAMPLE_LIMIT = 200

const ROLE_LABELS: Record<AuthUser['role'], string> = {
  super_admin: 'Super administrateur',
  institution: 'Institution (ART)',
  operator: 'Opérateur',
  premium: 'Accès premium',
}

interface NavItem {
  key: 'dashboard' | 'reports' | 'map' | 'operators' | 'alerts' | 'exports' | 'settings'
  icon: string
  enabled: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', icon: '📊', enabled: true },
  { key: 'map', icon: '🗺️', enabled: true },
  { key: 'reports', icon: '📄', enabled: false },
  { key: 'operators', icon: '📡', enabled: false },
  { key: 'alerts', icon: '🔔', enabled: false },
  { key: 'exports', icon: '⬇️', enabled: false },
  { key: 'settings', icon: '⚙️', enabled: false },
]

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

interface TrendPoint {
  date: string
  MTN: number
  Orange: number
  Camtel: number
}

interface TopZone {
  geohash: string
  count: number
  dominant: Operator
  lastReportAt: string
}

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div
      className="flex flex-col gap-1 p-5"
      style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, borderTop: `3px solid ${accent}` }}
    >
      <span className="text-sm" style={{ color: COLORS.textMedium }}>
        {label}
      </span>
      <span className="text-3xl font-bold" style={{ color: COLORS.textDark }}>
        {value}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user] = useState<AuthUser | null>(() => readStoredUser())
  const [reports, setReports] = useState<ApiReport[]>([])
  const [activeIncidents, setActiveIncidents] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [reportsRes, incidentsRes] = await Promise.all([
          api.get<{ items: ApiReport[]; nextCursor: string | null }>('/reports', {
            params: { limit: REPORTS_SAMPLE_LIMIT },
          }),
          api.get<{ items: ApiIncident[] }>('/incidents', { params: { status: 'active', limit: 200 } }),
        ])
        if (cancelled) return
        setReports(reportsRes.data.items)
        setActiveIncidents(incidentsRes.data.items.length)
        setError(null)
      } catch {
        if (!cancelled) setError('Impossible de charger les données du tableau de bord.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = window.setInterval(load, 60000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const stats = useMemo(() => {
    const now = new Date()
    const todayKey = now.toDateString()

    const uniqueDevices = new Set<string>()
    const byOperator: Record<Operator, number> = { MTN: 0, Orange: 0, Camtel: 0 }
    const byIssue: Record<IncidentType, number> = { outage: 0, slow: 0, unstable: 0, calls: 0, sms: 0 }
    let todayCount = 0

    const days: { key: string; label: string }[] = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      days.push({ key: d.toDateString(), label: d.toLocaleDateString('fr-FR', { weekday: 'short' }) })
    }
    const trend: TrendPoint[] = days.map(({ label }) => ({ date: label, MTN: 0, Orange: 0, Camtel: 0 }))

    const zoneMap = new Map<string, { count: number; byOperator: Record<Operator, number>; lastReportAt: string }>()

    for (const report of reports) {
      uniqueDevices.add(report.deviceHash)
      byOperator[report.operator] += 1
      byIssue[report.issueType] += 1
      if (new Date(report.userReportedAt).toDateString() === todayKey) todayCount += 1

      const dayIndex = days.findIndex((d) => d.key === new Date(report.userReportedAt).toDateString())
      if (dayIndex !== -1) trend[dayIndex][report.operator] += 1

      const zone = zoneMap.get(report.geohash6) ?? {
        count: 0,
        byOperator: { MTN: 0, Orange: 0, Camtel: 0 },
        lastReportAt: report.userReportedAt,
      }
      zone.count += 1
      zone.byOperator[report.operator] += 1
      if (new Date(report.userReportedAt) > new Date(zone.lastReportAt)) zone.lastReportAt = report.userReportedAt
      zoneMap.set(report.geohash6, zone)
    }

    const topZones: TopZone[] = Array.from(zoneMap.entries())
      .map(([geohash, zone]) => ({
        geohash,
        count: zone.count,
        dominant: OPERATORS.reduce((best, op) => (zone.byOperator[op] > zone.byOperator[best] ? op : best), OPERATORS[0]),
        lastReportAt: zone.lastReportAt,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return { total: reports.length, todayCount, uniqueDevices: uniqueDevices.size, byOperator, byIssue, trend, topZones }
  }, [reports])

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: COLORS.bgPage }}>
      {/* SIDEBAR */}
      <aside
        className="flex h-full w-[240px] flex-none flex-col justify-between"
        style={{ background: COLORS.bgSidebar, boxShadow: SHADOWS.sidebar }}
      >
        <div>
          <div className="flex items-center gap-3 px-5 py-5">
            <div
              className="flex h-9 w-9 items-center justify-center"
              style={{ background: COLORS.primary, borderRadius: RADIUS.sm }}
            >
              <img src={netAlerteMark} alt="" width={22} height={22} />
            </div>
            <span className="text-sm font-semibold" style={{ color: COLORS.textSidebarActive }}>
              NetAlerte CM
            </span>
          </div>

          <nav className="mt-2 flex flex-col gap-1 px-3">
            {NAV_ITEMS.map((item) => {
              const active = item.key === 'dashboard'
              const handleClick = () => {
                if (!item.enabled) return
                if (item.key === 'map') navigate('/')
              }
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={handleClick}
                  disabled={!item.enabled}
                  title={item.enabled ? undefined : 'Bientôt disponible'}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    background: active ? COLORS.bgSidebarHover : 'transparent',
                    color: active ? COLORS.textSidebarActive : COLORS.textSidebar,
                    borderRadius: RADIUS.sm,
                    opacity: item.enabled ? 1 : 0.45,
                    cursor: item.enabled ? 'pointer' : 'not-allowed',
                  }}
                >
                  <span>{item.icon}</span>
                  {t.nav[item.key]}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="px-3 pb-5">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium"
            style={{ color: COLORS.textSidebar, borderRadius: RADIUS.sm }}
          >
            <span>🚪</span>
            {t.logout}
          </button>
        </div>
      </aside>

      {/* COLONNE DROITE : topbar + contenu */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* TOPBAR */}
        <header
          className="flex h-[56px] flex-none items-center justify-between px-6"
          style={{ background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <span className="text-base font-semibold" style={{ color: COLORS.textDark }}>
            {t.nav.dashboard}
          </span>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span style={{ color: COLORS.textMedium }}>{user.email}</span>
              <span
                className="px-2 py-0.5 text-xs font-semibold"
                style={{ background: COLORS.primaryLight, color: COLORS.primaryDark, borderRadius: RADIUS.sm }}
              >
                {ROLE_LABELS[user.role]}
                {user.operatorScope ? ` · ${user.operatorScope}` : ''}
              </span>
            </div>
          )}
        </header>

        {/* CONTENU */}
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div
              className="mb-4 px-4 py-3 text-sm"
              style={{ background: COLORS.dangerLight, color: COLORS.danger, borderRadius: RADIUS.md }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-64 items-center justify-center" style={{ color: COLORS.textLight }}>
              Chargement…
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* KPI */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label={`${t.kpi.total} (échantillon ${REPORTS_SAMPLE_LIMIT})`} value={stats.total} accent={COLORS.primary} />
                <KpiCard label={t.kpi.today} value={stats.todayCount} accent={COLORS.success} />
                <KpiCard label={t.kpi.incidents} value={activeIncidents ?? '—'} accent={COLORS.danger} />
                <KpiCard label="Appareils contributeurs" value={stats.uniqueDevices} accent={COLORS.warning} />
              </div>

              {/* Graphique tendance + répartition opérateurs */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[60%_40%]">
                <div className="p-5" style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}>
                  <h2 className="mb-4 text-base font-semibold" style={{ color: COLORS.textDark }}>
                    {t.trend7days}
                  </h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={stats.trend}>
                      <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: COLORS.textMedium }} />
                      <YAxis tick={{ fontSize: 12, fill: COLORS.textMedium }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      {OPERATORS.map((operator) => (
                        <Line
                          key={operator}
                          type="monotone"
                          dataKey={operator}
                          name={OPERATOR_CONFIG[operator].label}
                          stroke={OPERATOR_CONFIG[operator].color}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-5" style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}>
                  <h2 className="mb-4 text-base font-semibold" style={{ color: COLORS.textDark }}>
                    {t.reportsByOperator}
                  </h2>
                  <div className="flex flex-col gap-3">
                    {OPERATORS.map((operator) => {
                      const value = stats.byOperator[operator]
                      const max = Math.max(1, ...OPERATORS.map((op) => stats.byOperator[op]))
                      const config = OPERATOR_CONFIG[operator]
                      return (
                        <div key={operator} className="flex items-center gap-3">
                          <span
                            className="w-[70px] flex-none px-2 py-1 text-center text-xs font-bold"
                            style={{ background: config.color, color: config.textColor, borderRadius: RADIUS.sm }}
                          >
                            {config.label}
                          </span>
                          <div className="h-2.5 flex-1 overflow-hidden" style={{ background: COLORS.border, borderRadius: RADIUS.sm }}>
                            <div
                              className="h-full"
                              style={{ width: `${(value / max) * 100}%`, background: config.color, borderRadius: RADIUS.sm }}
                            />
                          </div>
                          <span className="w-8 flex-none text-right text-sm font-semibold" style={{ color: COLORS.textDark }}>
                            {value}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <h2 className="mt-6 mb-3 text-base font-semibold" style={{ color: COLORS.textDark }}>
                    Par type de problème
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {ISSUE_TYPES.map((issue) => {
                      const config = ISSUE_CONFIG[issue]
                      return (
                        <span
                          key={issue}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
                          style={{ background: config.bg, color: config.color, borderRadius: RADIUS.sm }}
                        >
                          {config.emoji} {config.fr} · {stats.byIssue[issue]}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Top zones */}
              <div className="p-5" style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}>
                <h2 className="mb-4 text-base font-semibold" style={{ color: COLORS.textDark }}>
                  Top 10 — zones les plus actives (échantillon {REPORTS_SAMPLE_LIMIT} derniers signalements)
                </h2>
                {stats.topZones.length === 0 ? (
                  <p className="py-6 text-center text-sm" style={{ color: COLORS.textLight }}>
                    Aucun signalement disponible.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                            #
                          </th>
                          <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                            Zone (geohash)
                          </th>
                          <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                            Opérateur dominant
                          </th>
                          <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                            Signalements
                          </th>
                          <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                            Dernier signalement
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topZones.map((zone, index) => (
                          <tr key={zone.geohash} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                            <td className="px-3 py-2.5" style={{ color: COLORS.textLight }}>
                              {index + 1}
                            </td>
                            <td className="px-3 py-2.5 font-mono" style={{ color: COLORS.textDark }}>
                              {zone.geohash}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className="px-2 py-0.5 text-xs font-semibold"
                                style={{
                                  background: OPERATOR_CONFIG[zone.dominant].color,
                                  color: OPERATOR_CONFIG[zone.dominant].textColor,
                                  borderRadius: RADIUS.sm,
                                }}
                              >
                                {OPERATOR_CONFIG[zone.dominant].label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-semibold" style={{ color: COLORS.textDark }}>
                              {zone.count}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: COLORS.textMedium }}>
                              {new Date(zone.lastReportAt).toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
