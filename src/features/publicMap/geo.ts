/** Centre du rectangle englobant d'un polygone (même résultat que L.geoJSON(feature).getBounds().getCenter()). */
export function boundsCenter(rings: number[][][]): [lat: number, lng: number] {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
  }
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
}

export function offsetLatLng(center: [number, number], offset: [lng: number, lat: number]): [number, number] {
  return [center[0] + offset[1], center[1] + offset[0]]
}

/** Test point-dans-anneau par ray casting (algorithme standard, coordonnées [lng, lat]). */
function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i]
    const [lngJ, latJ] = ring[j]
    const crosses = latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI
    if (crosses) inside = !inside
  }
  return inside
}

/** Test point-dans-polygone (un ou plusieurs anneaux — pas de gestion de trous, inutile ici). */
export function pointInPolygon(lat: number, lng: number, coordinates: number[][][]): boolean {
  return coordinates.some((ring) => pointInRing(lat, lng, ring))
}

interface PolygonFeature {
  geometry: { coordinates: number[][][] }
}

/**
 * Cadre englobant l'ensemble des géométries fournies (régions + départements
 * combinés) — les deux couches GADM ne sont pas parfaitement imbriquées (un
 * département peut légèrement déborder du contour région simplifié), donc on
 * combine les deux pour garantir que le pays entier, y compris ses extrémités,
 * tienne dans le cadrage initial quelle que soit la forme du panneau carte.
 */
export function combinedBounds(...collections: { features: PolygonFeature[] }[]): [[number, number], [number, number]] {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const collection of collections) {
    for (const feature of collection.features) {
      for (const ring of feature.geometry.coordinates) {
        for (const [lng, lat] of ring) {
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
          if (lng < minLng) minLng = lng
          if (lng > maxLng) maxLng = lng
        }
      }
    }
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}
