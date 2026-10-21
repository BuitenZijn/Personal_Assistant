/**
 * Display formatters — platform-neutral, dependency-free.
 *
 * These are *total* functions: they always return a string and never decide
 * what "missing" means. Call sites that need a null/'N/A'/'--:--' fallback wrap
 * these with their own guard, which keeps each surface's copy exactly as it was
 * while sharing the arithmetic.
 */

export interface FormatDistanceOptions {
  /** Insert a space between the number and its unit ("450 m" vs "450m"). */
  space?: boolean
}

/**
 * Format a distance in meters.
 *
 * @example formatDistance(450) // "450m"
 * @example formatDistance(1234, { space: true }) // "1.2 km"
 */
export function formatDistance(
  meters: number,
  options?: FormatDistanceOptions,
): string {
  const gap = options?.space ? ' ' : ''
  if (meters < 1000) return `${Math.round(meters)}${gap}m`
  return `${(meters / 1000).toFixed(1)}${gap}km`
}

/**
 * Format a duration given in seconds, rounded to minutes.
 *
 * @example formatDurationFromSeconds(300) // "5 min"
 * @example formatDurationFromSeconds(5400) // "1h 30m"
 */
export function formatDurationFromSeconds(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

/**
 * Format a duration in ms, dropping to the two most significant units.
 *
 * @example formatDurationShort(45_000) // "45s"
 * @example formatDurationShort(192_000) // "3m 12s"
 */
export function formatDurationShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return `${minutes}m ${seconds}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

/**
 * Format a duration in ms for cards/stats, at minute precision.
 *
 * @example formatDurationCompact(300_000) // "5m"
 * @example formatDurationCompact(5_400_000) // "1h 30m"
 */
export function formatDurationCompact(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Format a duration in ms with spelled-out units.
 *
 * @example formatDurationVerbose(192_000) // "3 min 12 sec"
 */
export function formatDurationVerbose(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} sec`
  return `${minutes} min ${seconds} sec`
}

/**
 * Format a duration in ms showing every non-zero unit down to seconds.
 *
 * @example formatDurationHMS(3_723_000) // "1h 2m 3s"
 */
export function formatDurationHMS(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Format a duration in ms as a clock reading.
 *
 * @example formatDurationClock(65_000) // "1:05"
 * @example formatDurationClock(3_665_000) // "1:01:05"
 */
export function formatDurationClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${minutes}:${pad(seconds)}`
}

/**
 * Format a speed given in meters per second as km/h.
 *
 * @example formatSpeed(5) // "18.0 km/h"
 */
export function formatSpeed(metersPerSecond: number): string {
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`
}

/** Format a coordinate pair for display. */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}
