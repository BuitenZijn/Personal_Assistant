/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/__tests__',
    '<rootDir>/features',
    '<rootDir>/lib',
    '<rootDir>/components',
    '<rootDir>/navigation',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@pa/backend/(.*)$': '<rootDir>/../../packages/backend/$1',
    '^@pa/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@pa/ui/(.*)$': '<rootDir>/../../packages/ui/src/$1',
    '^@pa/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@pa/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}
