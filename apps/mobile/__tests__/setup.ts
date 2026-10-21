/**
 * Jest setup file for @pa/mobile tests
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'

// Tamagui registers global mouse/touch listeners at module load for its web
// build, which the `node` test environment does not provide. Without these,
// importing anything from @pa/ui throws before a single test runs, so no
// component that uses the design system can be tested at all.
const globalAny = globalThis as unknown as {
  addEventListener?: (...args: unknown[]) => void
  removeEventListener?: (...args: unknown[]) => void
}
globalAny.addEventListener ??= () => {}
globalAny.removeEventListener ??= () => {}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)

// Global test utilities
global.console = {
  ...console,
  // Uncomment to silence console during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
