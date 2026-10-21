import { Bike, Car, Footprints, Ship } from 'lucide-react-native'
import {
  formatDistance as formatDistanceShared,
  formatDurationFromSeconds as formatDurationFromSecondsShared,
} from '@pa/shared'

/**
 * Display formatters for the mobile app.
 *
 * The arithmetic lives in `@pa/shared`; this module owns the mobile
 * "missing value" conventions (null for absent data) and the RN icon mapping.
 */

export { formatDurationShort, formatDurationVerbose } from '@pa/shared'

/**
 * Format a duration given in seconds into a human-readable string.
 * Used for quest estimated durations (stored in seconds).
 *
 * Examples: "5 min", "1h 30m", "2h"
 */
export function formatDurationFromSeconds(seconds?: number): string | null {
  if (!seconds) return null
  return formatDurationFromSecondsShared(seconds)
}

/**
 * Format a duration from ms for display on cards/stats.
 * Returns a compact format like "5m", "1h 30m".
 * Returns a fallback string for null/undefined/zero values.
 */
export function formatDurationCompact(
  ms: number | null | undefined,
  fallback = '--:--',
): string {
  if (ms === null || ms === undefined || ms <= 0) return fallback
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  // Sub-minute runs used to read "0m" — show seconds instead.
  if (minutes === 0) return `${totalSeconds}s`
  return `${minutes}m`
}

/**
 * Format a distance in meters into a human-readable string.
 *
 * Examples: "150m", "2.3km"
 */
export function formatDistance(meters?: number): string | null {
  if (!meters) return null
  return formatDistanceShared(meters)
}

/**
 * Returns the appropriate Lucide icon component for a transport type.
 */
export function getTransportIcon(type?: string) {
  switch (type) {
    case 'bike':
      return Bike
    case 'car':
      return Car
    case 'boat':
      return Ship
    default:
      return Footprints
  }
}

/**
 * Short noun label for a transport type — used on compact cards.
 *
 * Examples: "Bike", "Car", "Walk"
 */
export function getTransportLabel(type?: string): string {
  switch (type) {
    case 'bike':
      return 'Bike'
    case 'car':
      return 'Car'
    case 'boat':
      return 'Boat'
    default:
      return 'Walk'
  }
}

/**
 * Activity label for a transport type — used on detail screens where the
 * label reads as an activity rather than a mode.
 *
 * Examples: "Cycling", "Driving", "Walking"
 */
export function getTransportActivityLabel(type?: string): string {
  switch (type) {
    case 'bike':
      return 'Cycling'
    case 'car':
      return 'Driving'
    default:
      return 'Walking'
  }
}

/**
 * Extract initials from a name string.
 * "Player 1" → "P1", "John Doe" → "JD", "alice" → "A"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? ''
    const last = parts[parts.length - 1]?.[0] ?? ''
    return (first + last).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

/**
 * Truncate a name for display in tight spaces.
 * Returns first name + last initial if too long.
 */
export function truncateName(name: string, maxLength = 12): string {
  if (name.length <= maxLength) return name
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1]?.[0] ?? ''}.`
  }
  return name.slice(0, maxLength)
}
