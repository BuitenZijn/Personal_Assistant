/** Resolve build-time values once; EAS profile values outrank local dotenv. */
function resolveBuildEnvironment(env) {
  const profile = env.EAS_BUILD_PROFILE
  const production =
    profile === 'production' ||
    profile === 'production-apk' ||
    env.APP_ENV === 'production'
  const url =
    env.EXPO_PUBLIC_CONVEX_URL || (!profile ? env.CONVEX_URL : undefined)
  if (!url)
    throw new Error(
      'Set EXPO_PUBLIC_CONVEX_URL for this build (or CONVEX_URL for local development).',
    )
  const parsed = new URL(url)
  if (
    production &&
    (parsed.protocol !== 'https:' ||
      ['localhost', '127.0.0.1'].includes(parsed.hostname))
  ) {
    throw new Error('Production requires an HTTPS Convex endpoint.')
  }
  return {
    EXPO_PUBLIC_CONVEX_URL: parsed.origin,
    SENTRY_ENVIRONMENT: production
      ? 'production'
      : env.APP_ENV ||
        (env.CONVEX_DEPLOYMENT?.startsWith('prod:')
          ? 'production'
          : 'development'),
  }
}
module.exports = { resolveBuildEnvironment }
