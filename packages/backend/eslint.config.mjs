import { config } from '@pa/eslint-config/base'
import globals from 'globals'

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    ignores: ['convex/_generated/**'],
  },
  // Convex backend files use process.env for env vars managed by Convex,
  // not by turbo, so disable the turbo env var rule for convex files.
  {
    files: ['convex/**/*.ts'],
    rules: {
      'turbo/no-undeclared-env-vars': 'off',
    },
  },
  // Scripts are Node.js files
  {
    files: ['scripts/**/*.{mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'off',
    },
  },
]
