const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

// Find the project root (monorepo root)
const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the specific workspace packages the mobile app imports,
// merged with Expo's defaults so expo-doctor is happy.
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(monorepoRoot, 'packages', 'backend'),
  path.resolve(monorepoRoot, 'packages', 'ui'),
  path.resolve(monorepoRoot, 'packages', 'shared'),
]

// Let Metro know where to resolve packages from
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Force a single React/React Native instance across the monorepo.
// This prevents invalid hook call errors when a dependency bundles its own React copy.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
}

// Add Tamagui
config.transformer.minifierConfig = {
  compress: {
    drop_console: false,
  },
}

module.exports = config
