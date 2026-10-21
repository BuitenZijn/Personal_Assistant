import { config } from '@pa/eslint-config/base'

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    // Vitest globals in the colocated tests
    files: ['src/**/*.test.ts'],
    languageOptions: {
      globals: { describe: 'readonly', it: 'readonly', expect: 'readonly' },
    },
  },
]
