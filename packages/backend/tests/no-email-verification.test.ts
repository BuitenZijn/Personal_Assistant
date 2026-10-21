/// <reference types="vite/client" />
/**
 * With `AUTH_EMAIL_VERIFICATION` off (this stage of the project), signing up
 * signs in straight away and no email goes out.
 */
import { convexTest } from 'convex-test'
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.AUTH_EMAIL_VERIFICATION = 'off'
})

import schema from '../convex/schema'
import { api } from '../convex/_generated/api'

const modules = import.meta.glob('../convex/**/*.ts')

const { sent } = vi.hoisted(() => ({ sent: [] as unknown[] }))
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: unknown) => {
        sent.push(payload)
        return { error: null }
      },
    }
  },
}))

// Signing in issues tokens, which needs a signing key.
beforeAll(async () => {
  const keys = await generateKeyPair('RS256', { extractable: true })
  const jwk = await exportJWK(keys.publicKey)
  vi.stubEnv('JWT_PRIVATE_KEY', await exportPKCS8(keys.privateKey))
  vi.stubEnv('JWKS', JSON.stringify({ keys: [{ use: 'sig', ...jwk }] }))
  vi.stubEnv('CONVEX_SITE_URL', 'https://example.convex.site')
})

beforeEach(() => {
  sent.length = 0
})

type T = ReturnType<typeof convexTest>

function signIn(t: T, params: Record<string, unknown>) {
  return t.action(api.auth.signIn, { provider: 'password', params })
}

function signUp(t: T, email: string, password = 'correct horse') {
  return signIn(t, {
    flow: 'signUp',
    email,
    password,
    firstName: 'Jane',
    lastName: 'Doe',
  })
}

describe('without email verification', () => {
  it('signs in on sign-up without sending a code', async () => {
    const t = convexTest(schema, modules)
    const result = await signUp(t, 'jane@x.test')
    expect(result.tokens).toBeTruthy()
    expect(sent).toHaveLength(0)
  })

  it('signs in with the password afterwards', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    const result = await signIn(t, {
      flow: 'signIn',
      email: 'jane@x.test',
      password: 'correct horse',
    })
    expect(result.tokens).toBeTruthy()
    expect(sent).toHaveLength(0)
  })

  it('refuses a second sign-up for the address, even with its password', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    const error = await signUp(t, 'jane@x.test').then(
      () => null,
      (e: unknown) => e,
    )
    expect(error).toMatchObject({ data: { code: 'EMAIL_IN_USE' } })
  })

  it('sends no code when one is asked for', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    await t.action(api.functions.users.resendVerificationCode, {
      email: 'jane@x.test',
    })
    expect(sent).toHaveLength(0)
  })
})
