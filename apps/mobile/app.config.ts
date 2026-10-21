import { config } from 'dotenv'
import { resolve } from 'path'
import type { ConfigContext } from 'expo/config'
import { resolveBuildEnvironment } from './lib/config/build-environment.cjs'

// Cloud builds must get their endpoint from their selected EAS profile.
if (!process.env.EAS_BUILD_PROFILE) {
  config({ path: resolve(__dirname, '../../.env'), quiet: true })
}

export default ({ config: expoConfig }: ConfigContext) => ({
  ...expoConfig,
  extra: { ...expoConfig.extra, ...resolveBuildEnvironment(process.env) },
})
