/**
 * Geo calculations — platform-neutral, dependency-free.
 *
 * Single source of truth for the haversine/bearing math that used to be
 * duplicated in `@pa/map` and `apps/mobile/lib/gameplay/LocationProcessor`.
 * Safe to import from background tasks (no React, no native modules).
 */

/** Earth's mean radius in meters. */
const EARTH_RADIUS_M = 6371e3

/** A geographic coordinate. Matches expo-location and deck.gl conventions. */
export interface LatLng {
  latitude: number
  longitude: number
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/**
 * Distance between two coordinates using the Haversine formula.
 * @returns Distance in meters
 */
export function calculateDistance(from: LatLng, to: LatLng): number {
  const phi1 = toRadians(from.latitude)
  const phi2 = toRadians(to.latitude)
  const deltaPhi = toRadians(to.latitude - from.latitude)
  const deltaLambda = toRadians(to.longitude - from.longitude)

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Bearing from one coordinate to another.
 * @returns Bearing in degrees (0-360, where 0 is North)
 */
export function calculateBearing(from: LatLng, to: LatLng): number {
  const phi1 = toRadians(from.latitude)
  const phi2 = toRadians(to.latitude)
  const deltaLambda = toRadians(to.longitude - from.longitude)

  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

/** Whether `user` is within `radiusMeters` of `target`. */
export function isWithinRadius(
  user: LatLng,
  target: LatLng,
  radiusMeters: number,
): boolean {
  return calculateDistance(user, target) <= radiusMeters
}

/**
 * Total distance along a path.
 * @returns Distance in meters
 */
export function calculatePathDistance(points: readonly LatLng[]): number {
  if (points.length < 2) return 0

  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    if (current && next) {
      total += calculateDistance(current, next)
    }
  }
  return total
}

const CARDINAL_SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
const CARDINAL_FULL = [
  'North',
  'Northeast',
  'East',
  'Southeast',
  'South',
  'Southwest',
  'West',
  'Northwest',
] as const

/** Bearing in degrees to a short cardinal direction ("NE"). */
export function getBearingDirection(bearing: number): string {
  return CARDINAL_SHORT[Math.round(bearing / 45) % 8] ?? 'N'
}

/** Bearing in degrees to a full cardinal direction ("Northeast"). */
export function getBearingDirectionFull(bearing: number): string {
  return CARDINAL_FULL[Math.round(bearing / 45) % 8] ?? 'North'
}
