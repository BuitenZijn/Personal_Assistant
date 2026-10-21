export type MobilePlatform = 'ios' | 'android'

export interface MinimumVersionPolicy {
  platform: MobilePlatform
  minimumVersion: string
  minimumBuild: number
  storeUrl: string
  message?: string
}

export function getMobilePlatform(
  expoOs: string | undefined = process.env.EXPO_OS,
): MobilePlatform | null {
  if (expoOs === 'ios' || expoOs === 'android') return expoOs
  return null
}

export function parseNativeBuild(build: string | null): number | null {
  if (build === null || !/^\d+$/.test(build.trim())) return null

  const parsed = Number(build)
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null
}

export function shouldRequireMinimumVersion({
  policy,
  currentBuild,
}: {
  policy: MinimumVersionPolicy | null | undefined
  currentBuild: number | null
}): boolean {
  if (!policy || currentBuild === null) return false
  return currentBuild < policy.minimumBuild
}
