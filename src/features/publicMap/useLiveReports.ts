import { useEffect, useRef, useState } from 'react'
import { WS_URL } from '../../config'
import departmentsGeojson from '../../data/departments.geojson.json'
import regionsGeojson from '../../data/regions.geojson.json'
import { boundsCenter, pointInPolygon } from './geo'
import type { ProblemCategory, PublicOperator, Signal } from './types'

/** Signalement public tel que diffusé par netalerte-backend/src/routes/stream.ts. */
interface PublicReport {
  id: string
  operator: string
  issueType: string
  comment: string | null
  latitude: number
  longitude: number
  createdAt: string
}

// Le flux WebSocket transporte aussi des messages `incidents_snapshot` /
// `incident_created` / `incident_updated` (voir stream.ts) qu'on ignore ici
// (non consommés par la carte publique pour l'instant) — d'où le cast `as`
// plutôt qu'un variant générique dans l'union, qui casserait le
// discriminant sur `type` pour le compilateur.
type StreamMessage = { type: 'reports_snapshot'; reports: PublicReport[] } | { type: 'report_created'; report: PublicReport }

interface RegionFeature {
  properties: { NAME_1: string }
  geometry: { coordinates: number[][][] }
}
interface DepartmentFeature {
  properties: { NAME_1: string; NAME_2: string }
  geometry: { coordinates: number[][][] }
}

const REGIONS = (regionsGeojson as { features: RegionFeature[] }).features
const DEPARTMENTS = (departmentsGeojson as { features: DepartmentFeature[] }).features

function nearestByCentroid<T extends { geometry: { coordinates: number[][][] } }>(
  lat: number,
  lng: number,
  features: T[],
): T | undefined {
  let best: T | undefined
  let bestDist = Infinity
  for (const feature of features) {
    const [centerLat, centerLng] = boundsCenter(feature.geometry.coordinates)
    const dist = (centerLat - lat) ** 2 + (centerLng - lng) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = feature
    }
  }
  return best
}

/**
 * Résout la région/le département d'un point par point-dans-polygone, avec
 * repli sur le centroïde le plus proche si le point (anonymisé, jusqu'à ~1 km
 * d'erreur via le geohash) tombe juste à l'extérieur des polygones
 * simplifiés — typiquement près d'une frontière ou du littoral. On garde la
 * région du département trouvé (plutôt que celle résolue indépendamment) pour
 * que le couple région/département reste toujours cohérent.
 */
function resolveZone(lat: number, lng: number): { regionName: string; departmentName: string | null } {
  const department = DEPARTMENTS.find((f) => pointInPolygon(lat, lng, f.geometry.coordinates)) ?? nearestByCentroid(lat, lng, DEPARTMENTS)
  const region = REGIONS.find((f) => pointInPolygon(lat, lng, f.geometry.coordinates)) ?? nearestByCentroid(lat, lng, REGIONS)
  return {
    regionName: department?.properties.NAME_1 ?? region?.properties.NAME_1 ?? 'Cameroun',
    departmentName: department?.properties.NAME_2 ?? null,
  }
}

/**
 * Contrairement à la simulation qu'elle remplace, on ne connaît jamais le
 * quartier/la commune exacte d'un vrai signalement (seule sa position
 * anonymisée à ~1 km près est connue) — le libellé se limite donc au
 * département (ou à la région si le département n'a pas pu être résolu).
 */
function buildLocationText(regionName: string, departmentName: string | null, operateur: PublicOperator): string {
  const lieu = departmentName ?? regionName
  return departmentName ? `${lieu}, ${regionName}, ${operateur}` : `${lieu}, ${operateur}`
}

function toSignal(report: PublicReport): Signal {
  const { regionName, departmentName } = resolveZone(report.latitude, report.longitude)
  const operateur = report.operator as PublicOperator
  return {
    id: report.id,
    regionName,
    departmentName,
    catKey: report.issueType as ProblemCategory,
    operateur,
    comment: report.comment,
    locationText: buildLocationText(regionName, departmentName, operateur),
    createdAt: new Date(report.createdAt).getTime(),
  }
}

const RECONNECT_DELAY_MS = 3000

/**
 * Connexion temps réel aux signalements publiés depuis l'app mobile (voir
 * netalerte-backend/src/routes/stream.ts) : un instantané des signalements
 * des 2 dernières heures est reçu à la connexion, puis chaque nouveau
 * signalement arrive au fil de l'eau via `report_created`. Remplace
 * l'ancienne simulation (useSignalSimulation.ts, conservée à titre de
 * référence) par de vraies données, avec reconnexion automatique en cas de
 * coupure réseau.
 */
export function useLiveReports(): Signal[] {
  const [signals, setSignals] = useState<Signal[]>([])
  const knownIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let cancelled = false

    function connect() {
      socket = new WebSocket(WS_URL)

      socket.onmessage = (event) => {
        let message: StreamMessage
        try {
          message = JSON.parse(String(event.data)) as StreamMessage
        } catch {
          return
        }

        if (message.type === 'reports_snapshot') {
          const fresh = message.reports.filter((report) => !knownIdsRef.current.has(report.id))
          for (const report of fresh) knownIdsRef.current.add(report.id)
          if (fresh.length > 0) setSignals((prev) => [...prev, ...fresh.map(toSignal)])
        } else if (message.type === 'report_created') {
          if (knownIdsRef.current.has(message.report.id)) return
          knownIdsRef.current.add(message.report.id)
          setSignals((prev) => [...prev, toSignal(message.report)])
        }
      }

      socket.onclose = () => {
        if (cancelled) return
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])

  return signals
}
