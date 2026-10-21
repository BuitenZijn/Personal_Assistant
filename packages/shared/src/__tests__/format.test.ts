import { describe, it, expect } from 'vitest'
import {
  formatDistance,
  formatDurationFromSeconds,
  formatDurationShort,
  formatDurationCompact,
  formatDurationVerbose,
  formatDurationHMS,
  formatDurationClock,
  formatSpeed,
  formatCoordinates,
} from '../format'

describe('formatDistance', () => {
  it('formats sub-kilometre distances in whole metres', () => {
    expect(formatDistance(0)).toBe('0m')
    expect(formatDistance(450)).toBe('450m')
    expect(formatDistance(450.4)).toBe('450m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('switches to kilometres at 1000m', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(1234)).toBe('1.2km')
    expect(formatDistance(23_400)).toBe('23.4km')
  })

  it('honours the spaced variant used by the web map', () => {
    expect(formatDistance(450, { space: true })).toBe('450 m')
    expect(formatDistance(1234, { space: true })).toBe('1.2 km')
  })
})

describe('duration formatters', () => {
  it('formatDurationFromSeconds rounds to minutes', () => {
    expect(formatDurationFromSeconds(300)).toBe('5 min')
    expect(formatDurationFromSeconds(3600)).toBe('1h')
    expect(formatDurationFromSeconds(5400)).toBe('1h 30m')
  })

  it('formatDurationShort keeps two units', () => {
    expect(formatDurationShort(45_000)).toBe('45s')
    expect(formatDurationShort(192_000)).toBe('3m 12s')
    expect(formatDurationShort(5_400_000)).toBe('1h 30m')
  })

  it('formatDurationCompact works at minute precision', () => {
    expect(formatDurationCompact(300_000)).toBe('5m')
    expect(formatDurationCompact(5_400_000)).toBe('1h 30m')
  })

  it('formatDurationVerbose spells out units', () => {
    expect(formatDurationVerbose(45_000)).toBe('45 sec')
    expect(formatDurationVerbose(192_000)).toBe('3 min 12 sec')
  })

  it('formatDurationHMS shows every non-zero unit', () => {
    expect(formatDurationHMS(3_000)).toBe('3s')
    expect(formatDurationHMS(123_000)).toBe('2m 3s')
    expect(formatDurationHMS(3_723_000)).toBe('1h 2m 3s')
  })

  it('formatDurationClock zero-pads', () => {
    expect(formatDurationClock(65_000)).toBe('1:05')
    expect(formatDurationClock(3_665_000)).toBe('1:01:05')
    expect(formatDurationClock(0)).toBe('0:00')
  })
})

describe('formatSpeed', () => {
  it('converts m/s to km/h with one decimal', () => {
    expect(formatSpeed(0)).toBe('0.0 km/h')
    expect(formatSpeed(5)).toBe('18.0 km/h')
  })
})

describe('formatCoordinates', () => {
  it('renders five decimal places', () => {
    expect(formatCoordinates(50.8467, 4.3525)).toBe('50.84670, 4.35250')
  })
})
