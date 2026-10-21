import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['tests/**/*.test.ts'],
    // The auth flow tests cover verification; tests/no-email-verification
    // turns it off for its own file.
    env: { AUTH_EMAIL_VERIFICATION: 'on' },
  },
})
