export type PublicOperator = 'MTN' | 'Orange' | 'Camtel'

/**
 * Mêmes identifiants que l'enum réel du backend (IncidentType / ISSUE_TYPES),
 * pour que cette simulation soit substituable par de vraies données sans
 * remapping — voir useSignalSimulation.ts.
 */
export type ProblemCategory = 'outage' | 'slow' | 'unstable' | 'calls' | 'sms'

export interface CategoryConfig {
  label: string
}

export interface Signal {
  id: string
  regionName: string
  departmentName: string | null
  catKey: ProblemCategory
  operateur: PublicOperator
  comment: string | null
  locationText: string
  createdAt: number
}

export interface MapFilter {
  level: 'region' | 'department'
  name: string
}

export type MapLevel = 'regions' | 'departments'

export type Period = '24h' | '7j' | 'mois' | 'annee'

export interface PeriodReference {
  operateurs: Record<PublicOperator, number>
  trendLabels: string[]
  trendByOperator: Record<PublicOperator, number[]>
}
