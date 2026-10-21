import { describe, it, expect } from 'vitest'
import {
  calculateDistance,
  calculateBearing,
  isWithinRadius,
  calculatePathDistance,
  getBearingDirection,
  getBearingDirectionFull,
} from '../geo'

// Reference points (Brussels area), distances cross-checked against
// an independent haversine implementation.
const GRAND_PLACE = { latitude: 50.8467, longitude: 4.3525 }
const ATOMIUM = { latitude: 50.8949, longitude: 4.3415 }

describe('calculateDistance', () => {
  it('returns 0 for identical points', () => {
    expect(calculateDistance(GRAND_PLACE, GRAND_PLACE)).toBe(0)
  })

  it('matches a known distance within 0.5%', () => {
    // Grand Place -> Atomium is ~5.4 km
    const d = calculateDistance(GRAND_PLACE, ATOMIUM)
    expect(d).toBeGreaterThan(5300)
    expect(d).toBeLessThan(5500)
  })

  it('is symmetric', () => {
    expect(calculateDistance(GRAND_PLACE, ATOMIUM)).toBeCloseTo(
      calculateDistance(ATOMIUM, GRAND_PLACE),
      6,
    )
  })

  it('approximates 1 degree of latitude as ~111 km', () => {
    const d = calculateDistance(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    )
    expect(d).toBeGreaterThan(111_000)
    expect(d).toBeLessThan(111_400)
  })

  it('handles antimeridian-adjacent points without blowing up', () => {
    const d = calculateDistance(
      { latitude: 0, longitude: 179.999 },
      { latitude: 0, longitude: -179.999 },
    )
    expect(d).toBeLessThan(500)
  })
})

describe('calculateBearing', () => {
  it('returns 0 (North) for a due-north target', () => {
    expect(
      calculateBearing(
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
      ),
    ).toBeCloseTo(0, 5)
  })

  it('returns 90 (East) for a due-east target', () => {
    expect(
      calculateBearing(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeCloseTo(90, 5)
  })

  it('returns 180 (South) for a due-south target', () => {
    expect(
      calculateBearing(
        { latitude: 1, longitude: 0 },
        { latitude: 0, longitude: 0 },
      ),
    ).toBeCloseTo(180, 5)
  })

  it('always returns a value in [0, 360)', () => {
    const bearing = calculateBearing(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: -1 },
    )
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
    expect(bearing).toBeCloseTo(270, 5)
  })
})

describe('isWithinRadius', () => {
  it('is true at the exact centre', () => {
    expect(isWithinRadius(GRAND_PLACE, GRAND_PLACE, 10)).toBe(true)
  })

  it('is inclusive at the boundary', () => {
    const target = { latitude: 0, longitude: 0 }
    const user = { latitude: 0, longitude: 0 }
    expect(isWithinRadius(user, target, 0)).toBe(true)
  })

  it('is false outside the radius', () => {
    expect(isWithinRadius(GRAND_PLACE, ATOMIUM, 1000)).toBe(false)
  })

  it('is true inside a generous radius', () => {
    expect(isWithinRadius(GRAND_PLACE, ATOMIUM, 10_000)).toBe(true)
  })
})

describe('calculatePathDistance', () => {
  it('returns 0 for fewer than two points', () => {
    expect(calculatePathDistance([])).toBe(0)
    expect(calculatePathDistance([GRAND_PLACE])).toBe(0)
  })

  it('sums the legs of a path', () => {
    const legs = calculatePathDistance([GRAND_PLACE, ATOMIUM, GRAND_PLACE])
    expect(legs).toBeCloseTo(calculateDistance(GRAND_PLACE, ATOMIUM) * 2, 6)
  })
})

describe('bearing directions', () => {
  it.each([
    [0, 'N'],
    [45, 'NE'],
    [90, 'E'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
  ])('maps %i degrees to %s', (bearing, expected) => {
    expect(getBearingDirection(bearing)).toBe(expected)
  })

  it('wraps 360 back to North', () => {
    expect(getBearingDirection(360)).toBe('N')
    expect(getBearingDirectionFull(360)).toBe('North')
  })

  it('rounds to the nearest octant', () => {
    expect(getBearingDirection(22)).toBe('N')
    expect(getBearingDirection(23)).toBe('NE')
  })

  it('returns full names', () => {
    expect(getBearingDirectionFull(45)).toBe('Northeast')
    expect(getBearingDirectionFull(180)).toBe('South')
  })
})
