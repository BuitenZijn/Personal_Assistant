import { resolveBuildEnvironment } from '../build-environment.cjs'

describe('release environment selection', () => {
  it('honors an EAS profile over a local backend', () => {
    expect(
      resolveBuildEnvironment({
        EAS_BUILD_PROFILE: 'preview',
        APP_ENV: 'preview',
        EXPO_PUBLIC_CONVEX_URL: 'https://preview.convex.cloud',
        CONVEX_URL: 'https://local.convex.cloud',
      }),
    ).toEqual({
      EXPO_PUBLIC_CONVEX_URL: 'https://preview.convex.cloud',
      SENTRY_ENVIRONMENT: 'preview',
    })
  })
  it('fails a release without an explicit profile endpoint', () => {
    expect(() =>
      resolveBuildEnvironment({
        EAS_BUILD_PROFILE: 'production',
        CONVEX_URL: 'https://local.convex.cloud',
      }),
    ).toThrow()
  })
  it('labels production without needing CONVEX_DEPLOYMENT', () => {
    expect(
      resolveBuildEnvironment({
        EAS_BUILD_PROFILE: 'production',
        EXPO_PUBLIC_CONVEX_URL: 'https://production.convex.cloud',
      }).SENTRY_ENVIRONMENT,
    ).toBe('production')
  })
  it('rejects insecure production endpoints', () => {
    expect(() =>
      resolveBuildEnvironment({
        APP_ENV: 'production',
        EXPO_PUBLIC_CONVEX_URL: 'http://localhost:3210',
      }),
    ).toThrow()
  })
})
