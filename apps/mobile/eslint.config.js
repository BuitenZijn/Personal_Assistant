// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

/**
 * Feature slices under features/. A feature's internals are private: other
 * code imports from its barrel, which is where the feature decides what is
 * public. Anchoring the patterns on the actual feature names keeps them from
 * matching app-level directories like components/shell.
 */
const FEATURES = [
  'auth',
  'control-room',
  'create-quest',
  'debug',
  'gameplay',
  'home',
  'missions',
  'quests',
  'settings',
]

const FEATURE_INTERNALS = FEATURES.flatMap(f => [
  `**/${f}/components/**`,
  `**/${f}/hooks/**`,
  `**/${f}/context/**`,
  `**/${f}/screens/**`,
])

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    settings: {
      'import/ignore': ['react-native', 'react-native-confetti-cannon'],
    },
  },
  {
    // Architectural boundaries.
    //
    // These conventions were documented long before they were enforced, and
    // every one of them had already been broken somewhere in the app. Lint is
    // the only thing that keeps them true.
    files: ['**/*.{ts,tsx}'],
    rules: {
      // These rules support React Compiler diagnostics, but the mobile app does
      // not enable React Compiler. They also flag established React Native and
      // Reanimated patterns (Animated.Value refs, shared-value mutation in
      // worklets, and state initialized by native subscriptions). Keep the
      // standard rules-of-hooks and exhaustive-deps checks from Expo enabled.
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: FEATURE_INTERNALS,
              message:
                "Import from the feature's barrel (features/<name>) instead of reaching into its internals. If the symbol is not exported, export it — that is the feature deciding what is public.",
            },
            {
              group: ['tamagui', '@tamagui/*'],
              message:
                'Import styled components from @pa/ui, not raw Tamagui. New styling belongs in packages/ui as a variant.',
            },
            {
              group: ['@pa/ui/src/*'],
              message:
                "Use the package's public subpaths (@pa/ui, @pa/ui/colors) rather than reaching into src/.",
            },
          ],
        },
      ],
    },
  },
  {
    // A feature's own barrel is exactly where its internals get re-exported.
    files: ['features/*/index.ts', 'features/*/components/index.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Location permissions go through lib/permissions so the quest-start gate
    // and the ad-hoc prompts cannot disagree about what was granted.
    files: ['features/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'CallExpression[callee.property.name=/^request(Foreground|Background)PermissionsAsync$/]',
          message:
            'Request location permission through lib/permissions (useGamePermissions) so every caller sees the same state.',
        },
      ],
    },
  },
])
