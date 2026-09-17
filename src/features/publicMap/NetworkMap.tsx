import * as L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import departmentsGeojson from '../../data/departments.geojson.json'
import regionsGeojson from '../../data/regions.geojson.json'
import { boundsCenter, combinedBounds, offsetLatLng } from './geo'
import { MAX_ZOOM, MIN_ZOOM, OPERATOR_FILL, OPERATOR_OFFSET, OPERATOR_STROKE, ZOOM_THRESHOLD } from './constants'
import type { MapFilter, MapLevel, PublicOperator, Signal } from './types'

const BASE_COLOR = '#BEDCF5'
const HOVER_COLOR = '#5B9BD5'
const BORDER_COLOR = '#FFFFFF'

const GLOBAL_STYLES = `
@keyframes na-signal-pulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(5.5); opacity: 0; } }
.signal-pulse-ring path, .signal-pulse-ring { animation: na-signal-pulse 900ms ease-out forwards; transform-origin: center; transform-box: fill-box; }
.info-tooltip { background: #FFFFFF; border: 1px solid #DCE3E8; border-radius: 6px; padding: 5px 10px; font-size: 12px; font-weight: 600; color: #1A2530; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.info-tooltip .parent { font-weight: 400; color: #5F5E5A; font-size: 10px; display: block; }
.leaflet-tooltip.info-tooltip::before { display: none; }
`

interface RegionFeature {
  type: 'Feature'
  geometry: { type: 'Polygon'; coordinates: number[][][] }
  properties: { NAME_1: string }
}

interface DepartmentFeature {
  type: 'Feature'
  geometry: { type: 'Polygon'; coordinates: number[][][] }
  properties: { NAME_1: string; NAME_2: string }
}

function radiusForCount(count: number): number {
  return Math.min(7 + count * 2.5, 26)
}

interface NetworkMapProps {
  signals: Signal[]
  filter: MapFilter | null
  onFilterChange: (filter: MapFilter | null) => void
  selectedOperator: PublicOperator | null
  onLevelChange: (level: MapLevel) => void
}

export default function NetworkMap({ signals, filter, onFilterChange, selectedOperator, onLevelChange }: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polygonLayerRef = useRef<L.GeoJSON | null>(null)
  const outlineLayerRef = useRef<L.GeoJSON | null>(null)
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map())
  const currentLevelRef = useRef<MapLevel>('regions')
  const filterRef = useRef(filter)
  const prevSignalCountRef = useRef(0)
  const highlightedLayerRef = useRef<L.Path | null>(null)

  filterRef.current = filter

  const regionCentroids = useMemo(() => {
    const map = new Map<string, [number, number]>()
    for (const feature of (regionsGeojson as { features: RegionFeature[] }).features) {
      map.set(feature.properties.NAME_1, boundsCenter(feature.geometry.coordinates))
    }
    return map
  }, [])

  const departmentInfo = useMemo(() => {
    const map = new Map<string, { center: [number, number]; region: string }>()
    for (const feature of (departmentsGeojson as { features: DepartmentFeature[] }).features) {
      map.set(feature.properties.NAME_2, { center: boundsCenter(feature.geometry.coordinates), region: feature.properties.NAME_1 })
    }
    return map
  }, [])

  const departmentsByRegion = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const feature of (departmentsGeojson as { features: DepartmentFeature[] }).features) {
      ;(map[feature.properties.NAME_1] ??= []).push(feature.properties.NAME_2)
    }
    return map
  }, [])

  // Styles globaux (pulsation, tooltips)
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.textContent = GLOBAL_STYLES
    document.head.appendChild(styleEl)
    return () => {
      document.head.removeChild(styleEl)
    }
  }, [])

  // Initialisation de la carte (une seule fois) — pas de fond de tuile,
  // uniquement les polygones sur un fond neutre, comme la référence.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      // zoomSnap par défaut (1) force fitBounds() à arrondir le zoom calculé
      // à l'entier inférieur, laissant une marge vide énorme autour du pays
      // (constaté : viewport visible jusqu'à 24°E de longitude alors que le
      // Cameroun s'arrête à 16,2°E) — combinée à la marge asymétrique pour la
      // légende, cette marge poussait l'est réel du pays (Kadey, Boumba et
      // Ngoko, Lom et Djerem) bien plus au centre que ce qu'un zoom visuel
      // sur "le bord est" laissait supposer, donnant l'impression que ces
      // départements ne s'affichaient pas alors qu'on zoomait simplement à
      // côté, dans le vide. Un pas de zoom fractionnaire permet un cadrage
      // fidèle à l'étendue réelle des données.
      zoomSnap: 0.25,
    })
    // Cadrage sur l'étendue réelle des données (régions + départements
    // combinés) plutôt qu'un centre/zoom fixes : garantit que le pays entier
    // — y compris ses extrémités comme Boumba-et-Ngoko à l'est — tienne dans
    // le cadre initial quelle que soit la taille du panneau carte. Marge
    // droite plus large : la légende opérateurs (coin haut-droit, ~130px)
    // est superposée à la carte et ne doit jamais recouvrir une partie du
    // pays (l'Est du Cameroun, à droite, est justement sous cette légende).
    map.fitBounds(combinedBounds(regionsGeojson as { features: { geometry: { coordinates: number[][][] } }[] }, departmentsGeojson as { features: { geometry: { coordinates: number[][][] } }[] }), {
      paddingTopLeft: [16, 16],
      paddingBottomRight: [136, 16],
    })

    // Pane dédié pour le contour régional superposé en mode départements :
    // z-index fixe entre les polygones (~400) et les tooltips (650), jamais
    // déplacé via bringToFront, sinon il masquerait la détection de survol
    // des départements en dessous.
    map.createPane('regionOutlinePane')
    map.getPane('regionOutlinePane')!.style.zIndex = '450'
    map.getPane('regionOutlinePane')!.style.pointerEvents = 'none'

    map.createPane('signalPane')
    map.getPane('signalPane')!.style.zIndex = '620'

    mapRef.current = map
    const markers = markersRef.current

    // Le conteneur change de taille quand la barre de filtre apparaît/disparaît
    // au-dessus de la carte (voir MapPage) — sans invalidateSize(), Leaflet
    // garde ses dimensions internes périmées et le rendu se décale/rogne près
    // des bords (typiquement les zones les plus à l'est du pays, sous la
    // légende). ResizeObserver couvre aussi le redimensionnement de fenêtre.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      polygonLayerRef.current = null
      outlineLayerRef.current = null
      markers.clear()
    }
  }, [])

  // Rendu des polygones (régions ou départements) + bascule automatique au zoom
  useEffect(() => {
    const mapInstance = mapRef.current
    if (!mapInstance) return
    const map = mapInstance

    function styleRegion(): L.PathOptions {
      return { fillColor: BASE_COLOR, weight: 1.2, opacity: 1, color: BORDER_COLOR, fillOpacity: 0.85 }
    }
    function styleOutline(): L.PathOptions {
      return { fillOpacity: 0, weight: 2.5, opacity: 1, color: '#1A2530', interactive: false, pane: 'regionOutlinePane' }
    }
    // bringToFront() lors du survol réordonne le nœud SVG dans le DOM ; sur des
    // départements limitrophes (ex. Lom-et-Djerem / Kadey / Boumba-et-Ngoko),
    // ce réordonnancement pendant que le curseur est encore sur la frontière
    // partagée peut faire perdre le mouseout du polygone précédent, qui reste
    // alors bloqué en HOVER_COLOR indéfiniment. On traque donc explicitement
    // le polygone actuellement survolé pour le réinitialiser nous-même avant
    // de surligner le suivant, plutôt que de compter uniquement sur son propre
    // mouseout.
    function highlight(e: L.LeafletMouseEvent) {
      const layer = e.target as L.Path
      if (highlightedLayerRef.current && highlightedLayerRef.current !== layer) {
        highlightedLayerRef.current.setStyle(styleRegion())
      }
      highlightedLayerRef.current = layer
      layer.setStyle({ fillColor: HOVER_COLOR, weight: 2, color: '#FFFFFF', fillOpacity: 0.95 })
      layer.bringToFront()
    }
    function reset(e: L.LeafletMouseEvent) {
      const layer = e.target as L.Path
      layer.setStyle(styleRegion())
      if (highlightedLayerRef.current === layer) highlightedLayerRef.current = null
    }

    function renderPolygons(level: MapLevel) {
      currentLevelRef.current = level
      onLevelChange(level)

      if (polygonLayerRef.current) map.removeLayer(polygonLayerRef.current)
      if (outlineLayerRef.current) {
        map.removeLayer(outlineLayerRef.current)
        outlineLayerRef.current = null
      }

      if (level === 'regions') {
        polygonLayerRef.current = L.geoJSON(regionsGeojson as GeoJSON.FeatureCollection, {
          style: styleRegion,
          onEachFeature: (feature, layer) => {
            const name = (feature.properties as { NAME_1: string }).NAME_1
            layer.bindTooltip(name, { className: 'info-tooltip', sticky: true, direction: 'top', offset: [0, -6] })
            layer.on({ mouseover: highlight, mouseout: reset, click: () => onFilterChange(filterRef.current?.name === name ? null : { level: 'region', name }) })
          },
        }).addTo(map)
      } else {
        polygonLayerRef.current = L.geoJSON(departmentsGeojson as GeoJSON.FeatureCollection, {
          style: styleRegion,
          onEachFeature: (feature, layer) => {
            const props = feature.properties as { NAME_1: string; NAME_2: string }
            layer.bindTooltip(`${props.NAME_2}<span class="parent">${props.NAME_1}</span>`, {
              className: 'info-tooltip',
              sticky: true,
              direction: 'top',
              offset: [0, -6],
            })
            layer.on({
              mouseover: highlight,
              mouseout: reset,
              click: () => onFilterChange(filterRef.current?.name === props.NAME_2 ? null : { level: 'department', name: props.NAME_2 }),
            })
          },
        }).addTo(map)
        outlineLayerRef.current = L.geoJSON(regionsGeojson as GeoJSON.FeatureCollection, { style: styleOutline }).addTo(map)
      }
    }

    renderPolygons('regions')

    function updateLevelForZoom() {
      const desired: MapLevel = map.getZoom() >= ZOOM_THRESHOLD ? 'departments' : 'regions'
      if (desired !== currentLevelRef.current) renderPolygons(desired)
    }
    map.on('zoomend', updateLevelForZoom)

    // Filet de sécurité : si le curseur quitte la carte sans qu'aucun mouseout
    // de polygone ne se soit déclenché (ex. sortie rapide par un bord),
    // resetStyle() sans argument réinitialise tous les polygones du calque.
    function resetAllHighlights() {
      highlightedLayerRef.current = null
      polygonLayerRef.current?.resetStyle()
    }
    const container = map.getContainer()
    container.addEventListener('mouseleave', resetAllHighlights)

    return () => {
      map.off('zoomend', updateLevelForZoom)
      container.removeEventListener('mouseleave', resetAllHighlights)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Agrégation des marqueurs par zone + opérateur, avec pulsation sur les
  // signaux nouvellement arrivés (pas de pulsation continue).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const visible = selectedOperator ? signals.filter((s) => s.operateur === selectedOperator) : signals
    const level = currentLevelRef.current

    interface Agg {
      zone: string
      operateur: PublicOperator
      count: number
    }
    const aggregation = new Map<string, Agg>()

    if (level === 'regions') {
      for (const s of visible) {
        const key = `${s.regionName}|${s.operateur}`
        const entry = aggregation.get(key) ?? { zone: s.regionName, operateur: s.operateur, count: 0 }
        entry.count += 1
        aggregation.set(key, entry)
      }
    } else {
      for (const s of visible) {
        const dep = s.departmentName
        if (!dep) continue
        const key = `${dep}|${s.operateur}`
        const entry = aggregation.get(key) ?? { zone: dep, operateur: s.operateur, count: 0 }
        entry.count += 1
        aggregation.set(key, entry)
      }
    }

    const seenKeys = new Set(aggregation.keys())
    markersRef.current.forEach((marker, key) => {
      if (!seenKeys.has(key)) {
        map.removeLayer(marker)
        markersRef.current.delete(key)
      }
    })

    for (const [key, agg] of aggregation) {
      const center = level === 'regions' ? regionCentroids.get(agg.zone) : departmentInfo.get(agg.zone)?.center
      if (!center) continue
      const latlng = offsetLatLng(center, OPERATOR_OFFSET[agg.operateur])
      const existing = markersRef.current.get(key)
      if (existing) {
        existing.setRadius(radiusForCount(agg.count))
        existing.setLatLng(latlng)
      } else {
        const marker = L.circleMarker(latlng, {
          pane: 'signalPane',
          radius: radiusForCount(agg.count),
          fillColor: OPERATOR_FILL[agg.operateur],
          color: OPERATOR_STROKE[agg.operateur],
          weight: 1.5,
          fillOpacity: 0.8,
        }).addTo(map)
        marker.bindTooltip(`${agg.zone} · ${agg.operateur} — ${agg.count} signalement${agg.count > 1 ? 's' : ''}`, {
          className: 'info-tooltip',
          direction: 'top',
          offset: [0, -6],
        })
        markersRef.current.set(key, marker)
      }
    }

    // Pulsation ponctuelle pour chaque signal nouvellement arrivé.
    const newSignals = signals.slice(prevSignalCountRef.current)
    prevSignalCountRef.current = signals.length
    for (const signal of newSignals) {
      if (selectedOperator && selectedOperator !== signal.operateur) continue
      const base = level === 'regions' ? regionCentroids.get(signal.regionName) : signal.departmentName ? departmentInfo.get(signal.departmentName)?.center : undefined
      if (!base) continue
      const latlng = offsetLatLng(base, OPERATOR_OFFSET[signal.operateur])
      const ring = L.circleMarker(latlng, {
        pane: 'signalPane',
        radius: 4,
        fill: false,
        color: OPERATOR_STROKE[signal.operateur],
        weight: 2,
        opacity: 0.9,
        className: 'signal-pulse-ring',
      }).addTo(map)
      window.setTimeout(() => map.removeLayer(ring), 950)
    }
  }, [signals, selectedOperator, regionCentroids, departmentInfo, departmentsByRegion])

  return <div ref={containerRef} className="h-full w-full" style={{ background: '#F4F6F8' }} />
}
