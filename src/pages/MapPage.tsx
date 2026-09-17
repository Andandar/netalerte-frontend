import { useMemo, useState } from 'react'
import netAlerteMark from '../assets/brand/netalerte-mark.svg'
import { PERIODS } from '../features/publicMap/constants'
import LiveFeed from '../features/publicMap/LiveFeed'
import MapLegend from '../features/publicMap/MapLegend'
import NetworkMap from '../features/publicMap/NetworkMap'
import TrendChart from '../features/publicMap/TrendChart'
import { useLiveReports } from '../features/publicMap/useLiveReports'
import { useTrendData } from '../features/publicMap/useTrendData'
import type { MapFilter, MapLevel, Period, PublicOperator } from '../features/publicMap/types'

const TESTEURS_ACTIFS = 1240 // Placeholder statique, comme dans la référence (pas de compteur réel de testeurs)

export default function MapPage() {
  const allSignals = useLiveReports()
  const [filter, setFilter] = useState<MapFilter | null>(null)
  const [period, setPeriod] = useState<Period>('24h')
  const [selectedOperator, setSelectedOperator] = useState<PublicOperator | null>(null)
  const [level, setLevel] = useState<MapLevel>('regions')

  const matchingSignals = useMemo(() => {
    if (!filter) return allSignals
    return allSignals.filter((s) => (filter.level === 'region' ? s.regionName === filter.name : s.departmentName === filter.name))
  }, [allSignals, filter])

  const zoneRatio = filter ? (allSignals.length > 0 ? matchingSignals.length / allSignals.length : 1 / 10) : 1
  const trend = useTrendData(period, zoneRatio)

  const zonesCount = useMemo(() => new Set(matchingSignals.map((s) => s.regionName)).size, [matchingSignals])

  return (
    <div className="flex h-screen w-screen flex-col gap-2 overflow-hidden p-2.5" style={{ background: '#F4F6F8', color: '#1A2530', fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      {/* TOPBAR */}
      <div className="flex flex-none items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
          <img src={netAlerteMark} alt="" width={18} height={18} />
          NetAlerte CM
        </div>
        <div className="flex flex-1 items-baseline justify-end gap-2.5">
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[15px] font-semibold">{zonesCount}</span>
            <span className="text-[10px]" style={{ color: '#5F5E5A' }}>
              zones
            </span>
          </div>
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[15px] font-semibold">{TESTEURS_ACTIFS.toLocaleString('fr-FR')}</span>
            <span className="text-[10px]" style={{ color: '#5F5E5A' }}>
              testeurs
            </span>
          </div>
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[15px] font-semibold">{matchingSignals.length.toLocaleString('fr-FR')}</span>
            <span className="text-[10px]" style={{ color: '#5F5E5A' }}>
              signalements
            </span>
          </div>
        </div>
        <span className="flex flex-none items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap" style={{ color: '#0F6E56' }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#1D9E75' }} />
          Live
        </span>
      </div>

      {/* FILTER BAR */}
      {filter && (
        <div
          className="flex flex-none items-center gap-2 rounded-md border px-2.5 py-1 text-xs"
          style={{ background: '#E6F1FB', borderColor: '#B5D4F4', color: '#0C447C' }}
        >
          <span>Filtre actif : {filter.name}</span>
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="ml-auto rounded-md border-0 bg-white px-2 py-0.5 text-[11px] font-medium"
            style={{ color: '#0C447C', fontFamily: 'inherit' }}
          >
            Reinitialiser
          </button>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: '2.1fr 1fr' }}>
        {/* MAP COLUMN */}
        <div className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border bg-white" style={{ borderColor: '#DCE3E8' }}>
            <div className="flex flex-none items-center justify-between gap-2 border-b px-2.5 py-2" style={{ borderColor: '#DCE3E8' }}>
              <span className="text-[11px] whitespace-nowrap" style={{ color: '#5F5E5A' }}>
                {level === 'regions' ? 'Vue nationale — par region' : 'Vue detaillee — par departement'}
              </span>
              <span className="text-[10px] whitespace-nowrap" style={{ color: '#898781' }}>
                Cliquez une zone pour filtrer · zoomez pour le detail par departement
              </span>
            </div>
            <div className="relative flex min-h-0 flex-1">
              <NetworkMap signals={allSignals} filter={filter} onFilterChange={setFilter} selectedOperator={selectedOperator} onLevelChange={setLevel} />
              <MapLegend values={trend.legend} selectedOperator={selectedOperator} onSelect={setSelectedOperator} />
            </div>
          </div>
        </div>

        {/* SIDE COLUMN */}
        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex flex-none gap-0.5 rounded-md p-0.5" style={{ background: '#EDEFF1' }}>
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className="flex-1 rounded border-0 px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: period === value ? '#FFFFFF' : 'transparent',
                  color: period === value ? '#1A2530' : '#5F5E5A',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <TrendChart labels={trend.chartLabels} series={trend.chartSeries} />
          <div className="min-h-0 flex-1">
            <LiveFeed signals={matchingSignals} filter={filter} />
          </div>
        </div>
      </div>
    </div>
  )
}
