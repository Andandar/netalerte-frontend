export type Severity = 'critical' | 'medium' | 'low'

export type Operator = 'MTN' | 'Orange' | 'Camtel'

export type IncidentType = 'outage' | 'slow' | 'unstable' | 'calls' | 'sms'

export interface Incident {
  id: string
  latitude: number
  longitude: number
  severity: Severity
  operator: Operator
  type: IncidentType
  location_name: string
  report_count: number
  unique_devices: number
  duration_minutes: number
  affected_users_estimate: number
  weighted_count: number
}

/** Forme brute renvoyée par GET /v1/incidents (backend, camelCase). */
export interface ApiIncident {
  id: string
  operator: Operator
  issueType: IncidentType
  severity: Severity
  geohash: string
  locationName: string | null
  affectedAreaRadius: number
  reportCount: number
  weightedCount: string | number
  uniqueDevices: number
  affectedUsersEstimate: number
  status: string
  startedAt: string
  resolvedAt: string | null
  updatedAt: string
  latitude: number
  longitude: number
}

export type Period = '24h' | '7d' | '30d'

export interface IncidentFilters {
  operators: Operator[]
  severities: Severity[]
  period: Period
}

export type UserRole = 'super_admin' | 'institution' | 'operator' | 'premium'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  operatorScope: Operator | null
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/** Forme brute d'un signalement renvoyé par GET /v1/reports (backend, camelCase). */
export interface ApiReport {
  id: string
  userReportedAt: string
  deviceCapturedAt: string
  syncedAt: string
  operator: Operator
  networkType: string
  signalStrength: number | null
  geohash6: string
  issueType: IncidentType
  userComment: string | null
  deviceHash: string
  os: string | null
  osVersion: string | null
  appVersion: string | null
  isOfflineReport: boolean
  trustScore: number
  createdAt: string
}
