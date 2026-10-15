import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import netAlerteMark from '../assets/brand/netalerte-mark-white.svg'
import { AlertIcon, NetworkIcon, ReportIcon, UsersIcon } from '../components/icons'
import KpiCard from '../components/KpiCard'
import { COLORS, OPERATOR_CONFIG, RADIUS, SHADOWS } from '../core/theme'
import api from '../utils/api'
import type { ApiDashboardStats, ApiTopZone, AuthUser, Operator } from '../types'

const ALL_OPERATORS: Operator[] = ['MTN', 'Orange', 'Camtel']

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

/** Rafraîchissement périodique du tableau de bord, comme demandé. */
const POLL_INTERVAL_MS = 5 * 60 * 1000

/** Nouvelles tentatives face à un backend Render endormi (offre gratuite). */
const MAX_LOAD_ATTEMPTS = 4
const RETRY_DELAY_MS = 3000

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

const PERIOD_OPTIONS = [7, 30, 90] as const
type PeriodDays = (typeof PERIOD_OPTIONS)[number]

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
  const [user] = useState<AuthUser | null>(() => readStoredUser())
  const [stats, setStats] = useState<ApiDashboardStats | null>(null)
  const [topZones, setTopZones] = useState<ApiTopZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7)
  const [operatorFilter, setOperatorFilter] = useState<Operator | 'all'>('all')
  const [exporting, setExporting] = useState(false)

  // Un compte "operator" (MTN/Orange/Camtel) est scopé à son propre opérateur
  // côté backend (voir applyDataFilter) : les autres opérateurs n'apparaissent
  // jamais dans les données renvoyées, mais la forme de la réponse contient
  // toujours les 3 clés (à 0 pour les opérateurs hors scope) — sans ce filtre
  // d'affichage, le graphique dessinerait quand même leur ligne et leur
  // légende à zéro, laissant deviner leur existence à un compte qui ne
  // devrait voir AUCUNE information sur les autres opérateurs.
  const visibleOperators = user?.role === 'operator' && user.operatorScope ? [user.operatorScope] : ALL_OPERATORS

  useEffect(() => {
    let cancelled = false
    const params: Record<string, string> = { days: String(periodDays) }
    if (operatorFilter !== 'all') params.operator = operatorFilter

    async function load(attempt = 1): Promise<void> {
      try {
        const [statsRes, zonesRes] = await Promise.all([
          api.get<ApiDashboardStats>('/stats/dashboard', { params }),
          api.get<{ items: ApiTopZone[] }>('/stats/top-zones', { params }),
        ])
        if (cancelled) return
        setStats(statsRes.data)
        setTopZones(zonesRes.data.items)
        setError(null)
        setLoading(false)
      } catch {
        if (cancelled) return
        // Le backend (Render, offre gratuite) peut être en veille et mettre
        // jusqu'à ~30-50s à se réveiller sur la toute première requête après
        // une période d'inactivité — sans nouvelle tentative, l'utilisateur
        // voyait une erreur juste après la connexion et devait rafraîchir la
        // page à la main pour que ça fonctionne. On retente plutôt, en
        // gardant le squelette de chargement affiché.
        if (attempt < MAX_LOAD_ATTEMPTS) {
          await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS))
          if (!cancelled) await load(attempt + 1)
          return
        }
        setError('Impossible de charger les données du tableau de bord.')
        setLoading(false)
      }
    }

    setLoading(true)
    load()
    const interval = window.setInterval(() => load(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [periodDays, operatorFilter])

  async function handleExport(): Promise<void> {
    setExporting(true)
    try {
      const params: Record<string, string> = { days: String(periodDays) }
      if (operatorFilter !== 'all') params.operator = operatorFilter
      const response = await api.get('/reports/export', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `netalerte-signalements-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError("Impossible d'exporter les données. Réessaie dans un instant.")
    } finally {
      setExporting(false)
    }
  }

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
        className="sticky top-0 z-10 grid h-16 flex-none grid-cols-[1fr_auto_1fr] items-center px-6"
        style={{ background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="col-start-1 flex w-fit items-center gap-3 justify-self-start"
        >
          <div className="flex h-10 w-10 items-center justify-center" style={{ background: COLORS.primary, borderRadius: RADIUS.sm }}>
            <img src={netAlerteMark} alt="" width={24} height={24} />
          </div>
          <span className="text-sm font-semibold" style={{ color: COLORS.textDark }}>
            NetAlerte CM
          </span>
        </button>

        {/* Grille à 3 colonnes explicitement adressées (plutôt que flex justify-between
            ou un auto-placement implicite) pour que ce titre reste centré sur la page
            et que le bouton de droite reste en colonne 3 même quand ce titre est masqué
            (hidden) sous le breakpoint sm — sinon l'auto-placement CSS Grid comble le
            "trou" laissé par l'élément masqué et pousse le bouton en colonne 2. */}
        <span className="col-start-2 hidden text-base font-semibold sm:block" style={{ color: COLORS.textMedium }}>
          Tableau de Bord — Accès Institutionnel
        </span>

        <button
          type="button"
          onClick={handleLogout}
          className="col-start-3 w-fit justify-self-end text-sm font-semibold"
          style={{ color: COLORS.danger }}
        >
          Déconnexion
        </button>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {error && (
          <div className="mb-4 px-4 py-3 text-sm" style={{ background: COLORS.dangerLight, color: COLORS.danger, borderRadius: RADIUS.md }}>
            {error}
          </div>
        )}

        {/* FILTRES */}
        <div
          className="mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 p-1" style={{ background: COLORS.bgPage, borderRadius: RADIUS.md }}>
              {PERIOD_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setPeriodDays(days)}
                  className="px-3 py-1.5 text-sm font-semibold transition-colors"
                  style={{
                    borderRadius: RADIUS.sm,
                    background: periodDays === days ? COLORS.primary : 'transparent',
                    color: periodDays === days ? COLORS.textWhite : COLORS.textMedium,
                  }}
                >
                  {days} jours
                </button>
              ))}
            </div>

            {/* Un compte "operator" est déjà cantonné à son propre opérateur côté
                serveur (voir visibleOperators ci-dessus) — lui montrer un sélecteur
                qu'il ne peut pas utiliser n'aurait pas de sens. */}
            {user?.role !== 'operator' && (
              <label className="flex items-center gap-2 text-sm font-medium" style={{ color: COLORS.textMedium }}>
                Opérateur
                <select
                  value={operatorFilter}
                  onChange={(event) => setOperatorFilter(event.target.value as Operator | 'all')}
                  className="px-3 py-1.5 text-sm font-semibold"
                  style={{ background: COLORS.bgPage, color: COLORS.textDark, borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}` }}
                >
                  <option value="all">Tous</option>
                  {ALL_OPERATORS.map((operator) => (
                    <option key={operator} value={operator}>
                      {OPERATOR_CONFIG[operator].label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="w-fit px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: COLORS.primary, color: COLORS.textWhite, borderRadius: RADIUS.sm }}
          >
            {exporting ? 'Export en cours…' : 'Exporter CSV'}
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !stats ? (
            Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-[84px]" />)
          ) : (
            <>
              <KpiCard label="Incidents actifs" value={stats.kpis.incidents_actifs} color="blue" icon={<AlertIcon className="h-6 w-6" />} />
              <KpiCard label="Signalements 24h" value={stats.kpis.signalements_24h} color="green" icon={<ReportIcon className="h-6 w-6" />} />
              <KpiCard
                label={`Disponibilité ${periodDays}j`}
                value={`${stats.kpis.disponibilite}%`}
                color={stats.kpis.disponibilite >= DISPONIBILITE_SEUIL_VERT ? 'green' : 'red'}
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
              Évolution des signalements — {periodDays} derniers jours
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
                  {visibleOperators.map((operator) => (
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
              <div className="flex flex-col items-center">
                {/* Légende rendue à la main en dessous (plutôt que via <Legend
                    align="right">), pour pouvoir centrer l'anneau sur cx="50%"
                    sans deviner la largeur que la légende va occuper — un
                    <Legend> latéral de Recharts se superpose au SVG sans
                    réduire sa zone de dessin, donc "cx" ne peut pas tenir
                    compte de sa largeur de façon fiable. */}
                <div className="relative w-full">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={stats.severity}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-269.99}
                      >
                        {stats.severity.map((entry) => (
                          <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? COLORS.textLight} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color: COLORS.textDark }}>
                      {totalSeverity}
                    </span>
                    <span className="text-xs" style={{ color: COLORS.textLight }}>
                      incidents
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                  {stats.severity.map((entry) => {
                    const pct = totalSeverity > 0 ? Math.round((entry.value / totalSeverity) * 100) : 0
                    return (
                      <span key={entry.name} className="flex items-center gap-1.5 text-sm" style={{ color: COLORS.textMedium }}>
                        <span
                          className="h-2.5 w-2.5 flex-none"
                          style={{ background: SEVERITY_COLORS[entry.name] ?? COLORS.textLight, borderRadius: RADIUS.sm }}
                        />
                        {entry.name} — {pct}%
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TOP ZONES */}
        <div className="mt-6 p-5" style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card }}>
          <h2 className="mb-4 text-base font-semibold" style={{ color: COLORS.textDark }}>
            Top 10 — Zones les plus affectées ({periodDays} derniers jours)
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
                    <th className="px-3 py-2 text-right font-medium" style={{ color: COLORS.textLight }}>
                      Incidents
                    </th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: COLORS.textLight }}>
                      Opérateur dominant
                    </th>
                    <th className="px-3 py-2 text-right font-medium" style={{ color: COLORS.textLight }}>
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
                      <td className="px-3 py-2.5 text-right font-semibold" style={{ color: COLORS.textDark }}>
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
                      <td className="px-3 py-2.5 text-right" style={{ color: COLORS.textMedium }}>
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
