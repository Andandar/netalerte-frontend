import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import netAlerteMark from '../assets/brand/netalerte-mark-white.svg'
import { AlertIcon, NetworkIcon, ReportIcon, UsersIcon } from '../components/icons'
import KpiCard from '../components/KpiCard'
import { COLORS, OPERATOR_CONFIG, RADIUS, SHADOWS } from '../core/theme'
import api from '../utils/api'
import type { ApiDashboardStats, ApiTopZone, Operator } from '../types'

const OPERATORS: Operator[] = ['MTN', 'Orange', 'Camtel']

/** Rafraîchissement périodique du tableau de bord, comme demandé. */
const POLL_INTERVAL_MS = 5 * 60 * 1000

/**
 * Couleurs propres à ce donut (distinctes des tokens globaux COLORS.danger/
 * warning/success, qui servent à d'autres usages dans l'app).
 */
const SEVERITY_COLORS: Record<string, string> = {
  Critique: '#FF3366',
  Moyen: '#FF9500',
  Faible: '#00CC66',
}

const DISPONIBILITE_SEUIL_VERT = 95

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<ApiDashboardStats | null>(null)
  const [topZones, setTopZones] = useState<ApiTopZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [statsRes, zonesRes] = await Promise.all([
          api.get<ApiDashboardStats>('/stats/dashboard'),
          api.get<{ items: ApiTopZone[] }>('/stats/top-zones'),
        ])
        if (cancelled) return
        setStats(statsRes.data)
        setTopZones(zonesRes.data.items)
        setError(null)
      } catch {
        if (!cancelled) setError('Impossible de charger les données du tableau de bord.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = window.setInterval(load, POLL_INTERVAL_MS)
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

  const totalSeverity = stats?.severity.reduce((sum, entry) => sum + entry.value, 0) ?? 0

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bgPage }}>
      {/* EN-TÊTE FIXE */}
      <header
        className="sticky top-0 z-10 flex h-16 flex-none items-center justify-between px-6"
        style={{ background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center" style={{ background: COLORS.primary, borderRadius: RADIUS.sm }}>
            <img src={netAlerteMark} alt="" width={24} height={24} />
          </div>
          <span className="text-sm font-semibold" style={{ color: COLORS.textDark }}>
            NetAlerte CM
          </span>
        </button>

        <span className="hidden text-base font-semibold sm:block" style={{ color: COLORS.textMedium }}>
          Tableau de Bord — Accès Institutionnel
        </span>

        <button type="button" onClick={handleLogout} className="text-sm font-semibold" style={{ color: COLORS.danger }}>
          Déconnexion
        </button>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {error && (
          <div className="mb-4 px-4 py-3 text-sm" style={{ background: COLORS.dangerLight, color: COLORS.danger, borderRadius: RADIUS.md }}>
            {error}
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !stats ? (
            Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-[84px]" />)
          ) : (
            <>
              <KpiCard label="Incidents actifs" value={stats.kpis.incidents_actifs} color="blue" icon={<AlertIcon className="h-6 w-6" />} />
              <KpiCard label="Signalements 24h" value={stats.kpis.signalements_24h} color="green" icon={<ReportIcon className="h-6 w-6" />} />
              <KpiCard
                label="Disponibilité 7j"
                value={`${stats.kpis.disponibilite_7j}%`}
                color={stats.kpis.disponibilite_7j >= DISPONIBILITE_SEUIL_VERT ? 'green' : 'red'}
                icon={<NetworkIcon className="h-6 w-6" />}
              />
              <KpiCard label="Contributeurs actifs" value={stats.kpis.contributeurs_actifs} color="blue" icon={<UsersIcon className="h-6 w-6" />} />
            </>
          )}
        </div>

        {/* GRAPHIQUES */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[60%_40%]">
          <div className="p-5" style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}>
            <h2 className="mb-4 text-base font-semibold" style={{ color: COLORS.textDark }}>
              Évolution des signalements — 7 derniers jours
            </h2>
            {loading || !stats ? (
              <SkeletonBlock className="h-[280px]" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.trend}>
                  <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: COLORS.textMedium }} tickFormatter={formatShortDate} />
                  <YAxis tick={{ fontSize: 12, fill: COLORS.textMedium }} allowDecimals={false} />
                  <Tooltip labelFormatter={(label) => formatShortDate(String(label))} />
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
            )}
          </div>

          <div className="p-5" style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}>
            <h2 className="mb-4 text-base font-semibold" style={{ color: COLORS.textDark }}>
              Répartition par gravité
            </h2>
            {loading || !stats ? (
              <SkeletonBlock className="h-[280px]" />
            ) : stats.severity.length === 0 ? (
              <p className="flex h-[280px] items-center justify-center text-sm" style={{ color: COLORS.textLight }}>
                Aucun incident actif.
              </p>
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={stats.severity} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {stats.severity.map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? COLORS.textLight} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value: string) => {
                        const entry = stats.severity.find((s) => s.name === value)
                        const pct = entry && totalSeverity > 0 ? Math.round((entry.value / totalSeverity) * 100) : 0
                        return `${value} — ${pct}%`
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute top-0 left-0 flex h-full w-[60%] flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: COLORS.textDark }}>
                    {totalSeverity}
                  </span>
                  <span className="text-xs" style={{ color: COLORS.textLight }}>
                    incidents
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TOP ZONES */}
        <div className="mt-6 p-5" style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}>
          <h2 className="mb-4 text-base font-semibold" style={{ color: COLORS.textDark }}>
            Top 10 — Zones les plus affectées cette semaine
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-10" />
              ))}
            </div>
          ) : topZones.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: COLORS.textLight }}>
              Aucune donnée pour cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ background: COLORS.bgPage }}>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                      #
                    </th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                      Zone
                    </th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                      Région
                    </th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                      Incidents
                    </th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                      Opérateur dominant
                    </th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                      Durée moy.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topZones.map((zone) => (
                    <tr
                      key={zone.geohash}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      style={{ borderTop: `1px solid ${COLORS.border}` }}
                      onClick={() => window.open(`https://netalerte.cm?geohash=${zone.geohash}`, '_blank', 'noopener,noreferrer')}
                    >
                      <td className="px-3 py-2.5" style={{ color: COLORS.textLight }}>
                        {zone.rank}
                      </td>
                      <td className="px-3 py-2.5 font-medium" style={{ color: COLORS.textDark }}>
                        {zone.zone}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: COLORS.textMedium }}>
                        {zone.region}
                      </td>
                      <td className="px-3 py-2.5 font-semibold" style={{ color: COLORS.textDark }}>
                        {zone.incidents}
                      </td>
                      <td className="px-3 py-2.5">
                        {zone.operateurDominant && (
                          <span
                            className="px-2 py-0.5 text-xs font-semibold"
                            style={{
                              background: OPERATOR_CONFIG[zone.operateurDominant].color,
                              color: OPERATOR_CONFIG[zone.operateurDominant].textColor,
                              borderRadius: RADIUS.sm,
                            }}
                          >
                            {OPERATOR_CONFIG[zone.operateurDominant].label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: COLORS.textMedium }}>
                        {zone.dureeMoyenneHeures != null ? `${zone.dureeMoyenneHeures} h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
