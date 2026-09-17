import { useMemo } from 'react'
import { OPERATORS, PERIOD_REFERENCE } from './constants'
import type { Period, PublicOperator } from './types'

export interface TrendData {
  legend: Record<PublicOperator, number>
  chartLabels: string[]
  chartSeries: Record<PublicOperator, number[]>
}

/**
 * Données de tendance pour la période sélectionnée, mises à l'échelle par
 * `zoneRatio` (part du filtre région/département actif dans le total du
 * jour). Isolé en hook pour être remplacé par un vrai appel réseau agrégé
 * par période plus tard, sans changer l'interface du composant appelant.
 */
export function useTrendData(period: Period, zoneRatio: number): TrendData {
  return useMemo(() => {
    const ref = PERIOD_REFERENCE[period]
    const legend = {} as Record<PublicOperator, number>
    const chartSeries = {} as Record<PublicOperator, number[]>
    for (const operator of OPERATORS) {
      legend[operator] = Math.round(ref.operateurs[operator] * zoneRatio)
      chartSeries[operator] = ref.trendByOperator[operator].map((v) => Math.round(v * zoneRatio))
    }
    return { legend, chartLabels: ref.trendLabels, chartSeries }
  }, [period, zoneRatio])
}
