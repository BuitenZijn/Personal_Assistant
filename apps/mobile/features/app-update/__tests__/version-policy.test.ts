import {
  getMobilePlatform,
  parseNativeBuild,
  shouldRequireMinimumVersion,
  type MinimumVersionPolicy,
} from '../version-policy'

const policy: MinimumVersionPolicy = {
  platform: 'ios',
  minimumVersion: '1.1.0',
  minimumBuild: 12,
  storeUrl: 'https://apps.apple.com/app/id123',
}

describe('minimum version policy', () => {
  it('accepts only native mobile platforms', () => {
    expect(getMobilePlatform('ios')).toBe('ios')
    expect(getMobilePlatform('android')).toBe('android')
    expect(getMobilePlatform('web')).toBeNull()
    expect(getMobilePlatform('windows')).toBeNull()
  })

  it('parses numeric native build identifiers', () => {
    expect(parseNativeBuild('12')).toBe(12)
    expect(parseNativeBuild(' 42 ')).toBe(42)
    expect(parseNativeBuild(null)).toBeNull()
    expect(parseNativeBuild('1.2')).toBeNull()
    expect(parseNativeBuild('build-12')).toBeNull()
    expect(parseNativeBuild('0')).toBeNull()
  })

  it('requires an update only below the configured build floor', () => {
    expect(
      shouldRequireMinimumVersion({
        policy,
        currentBuild: 11,
      }),
    ).toBe(true)
    expect(
      shouldRequireMinimumVersion({
        policy,
        currentBuild: 12,
      }),
    ).toBe(false)
    expect(
      shouldRequireMinimumVersion({
        policy,
        currentBuild: 13,
      }),
    ).toBe(false)
  })

  it('fails open without a valid policy or build', () => {
    expect(
      shouldRequireMinimumVersion({
        policy: null,
        currentBuild: 1,
      }),
    ).toBe(false)
    expect(
      shouldRequireMinimumVersion({
        policy,
        currentBuild: null,
      }),
    ).toBe(false)
  })
})
