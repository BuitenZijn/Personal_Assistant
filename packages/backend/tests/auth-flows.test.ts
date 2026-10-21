/// <reference types="vite/client" />
/**
 * The password flows end to end through `auth:signIn`: coded errors,
 * normalised emails, throttled emails and the password-less "resend code".
 * Emails are captured instead of sent.
 */
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'
import {
  AUTH_EMAIL_COOLDOWN_MS,
  AUTH_EMAIL_WINDOW_MS,
  AUTH_EMAILS_PER_WINDOW,
  authEmailSendDecision,
} from '../convex/lib/auth'

const modules = import.meta.glob('../convex/**/*.ts')

const { sent } = vi.hoisted(() => ({
  sent: [] as { to: string[]; subject: string }[],
}))
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: { to: string[]; subject: string }) => {
        sent.push(payload)
        return { error: null }
      },
    }
  },
}))

beforeEach(() => {
  vi.stubEnv('SITE_URL', 'http://localhost:3000')
  sent.length = 0
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
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

async function errorOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error, 'expected a rejection').not.toBeNull()
  return error as { data?: { code?: string; message?: string } }
}

const throttleRows = (t: T) =>
  t.run(ctx => ctx.db.query('authEmailThrottles').collect())
const scheduledJobs = (t: T) =>
  t.run(ctx => ctx.db.system.query('_scheduled_functions').collect())

/** How an account's stored address looked before addresses were normalised. */
async function storeAs(t: T, email: string, stored: string) {
  await t.run(async ctx => {
    const account = (await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', q =>
        q.eq('provider', 'password').eq('providerAccountId', email),
      )
      .unique())!
    await ctx.db.patch(account._id, {
      providerAccountId: stored,
      ...(account.emailVerified ? { emailVerified: stored } : {}),
    })
    await ctx.db.patch(account.userId, { email: stored })
  })
}

/** A signed-up account, marked verified as if the code had been entered. */
async function verifiedAccount(t: T, email: string, password?: string) {
  await signUp(t, email, password)
  return await t.run(async ctx => {
    const account = (await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', q =>
        q.eq('provider', 'password').eq('providerAccountId', email),
      )
      .unique())!
    await ctx.db.patch(account._id, { emailVerified: email })
    await ctx.db.patch(account.userId, { emailVerificationTime: Date.now() })
    return account.userId
  })
}

describe('sign-up and sign-in errors (W-H5)', () => {
  it('codes a short password, a taken email and bad credentials', async () => {
    const t = convexTest(schema, modules)
    expect(
      (await errorOf(signUp(t, 'jane@x.test', 'short'))).data,
    ).toMatchObject({ code: 'INVALID_PASSWORD' })
    await signUp(t, 'jane@x.test')
    expect(
      (await errorOf(signUp(t, 'jane@x.test', 'another password'))).data,
    ).toMatchObject({ code: 'EMAIL_IN_USE' })

    const wrongPassword = await errorOf(
      signIn(t, {
        flow: 'signIn',
        email: 'jane@x.test',
        password: 'nope nope',
      }),
    )
    const unknownEmail = await errorOf(
      signIn(t, { flow: 'signIn', email: 'who@x.test', password: 'nope nope' }),
    )
    // The same answer either way: sign-in doesn't reveal who has an account.
    expect(wrongPassword.data).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email address or password.',
    })
    expect(unknownEmail.data).toEqual(wrongPassword.data)
  })

  it('codes a wrong verification code', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    const error = await errorOf(
      signIn(t, {
        flow: 'email-verification',
        email: 'jane@x.test',
        code: '000000',
      }),
    )
    expect(error.data).toMatchObject({ code: 'INVALID_CODE' })
  })
})

// Every sign-in hashes a password. The two long tests take under a second
// locally but went past vitest's 5s default on CI.
describe('passwords are only checked with a limit on wrong ones', () => {
  it('doesn’t email an unverified account on every sign-in', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    // Anyone can sign an address up with a password of their choosing.
    await signUp(t, 'victim@x.test')
    const signInAs = (password: string) =>
      signIn(t, { flow: 'signIn', email: 'victim@x.test', password })

    for (let i = 0; i < 8; i++) {
      // Still sent to the code page, but the code sent before still works.
      expect(await signInAs('correct horse')).toEqual({ tokens: null })
    }
    expect(sent).toHaveLength(1)

    // A wrong password emails nothing, and counts as a failed sign-in.
    expect((await errorOf(signInAs('wrong horse'))).data).toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(sent).toHaveLength(1)
    expect(
      await t.run(ctx => ctx.db.query('authRateLimits').collect()),
    ).toHaveLength(1)

    vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
    expect(await signInAs('correct horse')).toEqual({ tokens: null })
    expect(sent).toHaveLength(2)
  }, 20_000)

  it('doesn’t let signing up check a verified account’s password', async () => {
    const t = convexTest(schema, modules)
    await verifiedAccount(t, 'jane@x.test')
    for (let i = 0; i < 15; i++) {
      expect(
        (await errorOf(signUp(t, 'jane@x.test', `guess number ${i}`))).data,
      ).toMatchObject({ code: 'EMAIL_IN_USE' })
    }
    // Not even the right one: signing up answers the same.
    expect(
      (await errorOf(signUp(t, 'Jane@x.test', 'correct horse'))).data,
    ).toMatchObject({ code: 'EMAIL_IN_USE' })
  })

  it('limits wrong passwords when signing up to an unverified account', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    for (let i = 0; i < 10; i++) {
      expect(
        (await errorOf(signUp(t, 'jane@x.test', `guess number ${i}`))).data,
      ).toMatchObject({ code: 'EMAIL_IN_USE' })
    }
    expect(
      (await errorOf(signUp(t, 'jane@x.test', 'correct horse'))).data,
    ).toMatchObject({ code: 'TOO_MANY_REQUESTS' })
  }, 20_000)

  it('stores nothing for a sign-up that fails its checks', async () => {
    const t = convexTest(schema, modules)
    const error = await errorOf(
      signIn(t, {
        flow: 'signUp',
        email: 'jane@x.test',
        password: 'correct horse',
        firstName: 'Jane',
        lastName: ' ',
      }),
    )
    expect(error.data).toMatchObject({ code: 'INVALID_ARGUMENT' })
    expect(await throttleRows(t)).toEqual([])
  })
})

describe('parameters that aren’t strings are refused (D-A1)', () => {
  it('doesn’t let an array email sign up past the checks to guess a password', async () => {
    const t = convexTest(schema, modules)
    await verifiedAccount(t, 'jane@x.test')
    // `String(['jane@x.test'])` is the address: this used to skip every check
    // and reach the library's own sign-up, which compares the password with
    // no limit on wrong ones, and signs in with the right one.
    const signUpAs = (password: string) =>
      signIn(t, {
        flow: 'signUp',
        email: ['jane@x.test'],
        password,
        firstName: 'Jane',
        lastName: 'Doe',
      })
    for (let i = 0; i < 12; i++) {
      expect((await errorOf(signUpAs(`guess number ${i}`))).data).toMatchObject(
        { code: 'INVALID_ARGUMENT' },
      )
    }
    expect((await errorOf(signUpAs('correct horse'))).data).toMatchObject({
      code: 'INVALID_ARGUMENT',
    })
    expect(
      await t.run(ctx => ctx.db.query('authAccounts').collect()),
    ).toHaveLength(1)
  })

  it('refuses an email or password that isn’t a string in every flow', async () => {
    const t = convexTest(schema, modules)
    // Unverified: signing in to it with its password emails it a code.
    await signUp(t, 'jane@x.test')
    sent.length = 0
    const email = ['jane@x.test']
    const refused: Record<string, unknown>[] = [
      { flow: 'signIn', email, password: 'correct horse' },
      { flow: 'signIn', email, password: '' },
      { flow: 'signIn', password: 'correct horse' },
      { flow: 'reset', email, redirectTo: '/reset-password' },
      { flow: 'email-verification', email },
      { flow: 'email-verification', email, code: '000000' },
      {
        flow: 'reset-verification',
        email,
        code: 'x',
        newPassword: 'new password',
      },
      { flow: 'signIn', email: 'jane@x.test', password: ['correct horse'] },
      {
        flow: 'signUp',
        email: 'new@x.test',
        password: 12345678,
        firstName: 'Jane',
        lastName: 'Doe',
      },
      {
        flow: 'reset-verification',
        email: 'jane@x.test',
        code: 'x',
        newPassword: ['new password'],
      },
    ]
    for (const params of refused) {
      expect(
        (await errorOf(signIn(t, params))).data,
        JSON.stringify(params),
      ).toMatchObject({ code: 'INVALID_ARGUMENT' })
    }
    expect(sent).toEqual([])
    expect(
      await t.run(ctx => ctx.db.query('authRateLimits').collect()),
    ).toEqual([])
  })
})

describe('overlong email addresses are refused (D-A3)', () => {
  it('refuses addresses over 254 characters before looking them up', async () => {
    const t = convexTest(schema, modules)
    const tooLong = `${'j'.repeat(248)}@x.test`
    expect(tooLong).toHaveLength(255)
    const refused: Record<string, unknown>[] = [
      {
        flow: 'signUp',
        email: tooLong,
        password: 'correct horse',
        firstName: 'Jane',
        lastName: 'Doe',
      },
      { flow: 'signIn', email: tooLong, password: 'correct horse' },
      { flow: 'signIn', email: tooLong, password: '' },
      { flow: 'reset', email: tooLong, redirectTo: '/reset-password' },
      { flow: 'email-verification', email: tooLong },
      { flow: 'email-verification', email: tooLong, code: '000000' },
      {
        flow: 'reset-verification',
        email: tooLong,
        code: 'x',
        newPassword: 'new password',
      },
    ]
    for (const params of refused) {
      expect(
        (await errorOf(signIn(t, params))).data,
        String(params.flow),
      ).toMatchObject({ code: 'INVALID_ARGUMENT' })
    }
    expect(
      (
        await errorOf(
          t.action(api.functions.users.resendVerificationCode, {
            email: tooLong,
          }),
        )
      ).data,
    ).toMatchObject({ code: 'INVALID_ARGUMENT' })
    expect(await t.run(ctx => ctx.db.query('authAccounts').collect())).toEqual(
      [],
    )
    expect(sent).toEqual([])

    // 254 is allowed; the spaces around an address don't count.
    await signUp(t, ` ${'j'.repeat(247)}@x.test `)
    expect(sent).toHaveLength(1)
  })
})

describe('email addresses are case-insensitive', () => {
  it('stores the normalised address and finds it however it is typed', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, '  Jane.Doe@Example.TEST ')
    const stored = await t.run(async ctx => ({
      accounts: (await ctx.db.query('authAccounts').collect()).map(
        a => a.providerAccountId,
      ),
      users: (await ctx.db.query('users').collect()).map(u => u.email),
    }))
    expect(stored).toEqual({
      accounts: ['jane.doe@example.test'],
      users: ['jane.doe@example.test'],
    })
    expect(sent.map(e => e.to)).toEqual([['jane.doe@example.test']])

    // Signing up again with other capitals is the same account.
    expect(
      (await errorOf(signUp(t, 'JANE.DOE@example.test', 'different pw'))).data,
    ).toMatchObject({ code: 'EMAIL_IN_USE' })
  })

  it('verifies a code typed against a differently-capitalised address', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    const code = sent[0].subject.slice(0, 6)
    // Signing in generates session tokens, which need signing keys this
    // test doesn't configure; getting past the code check is what matters.
    const error = await errorOf(
      signIn(t, { flow: 'email-verification', email: 'Jane@X.test', code }),
    )
    expect(error.data?.code).not.toBe('INVALID_CODE')
    const verified = await t.run(
      async ctx => (await ctx.db.query('authAccounts').first())!.emailVerified,
    )
    expect(verified).toBe('jane@x.test')
  })

  it('still reaches an unmigrated account stored with capitals', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    // As stored before normalisation.
    await storeAs(t, 'jane@x.test', 'Jane@X.test')
    for (const email of ['Jane@X.test', ' jane@x.test', 'JANE@X.TEST']) {
      expect(
        await t.query(internal.functions.users.passwordAccountState, {
          email,
        }),
      ).toMatchObject({ email: 'Jane@X.test', verified: false })
    }
    expect(
      await t.query(internal.functions.users.passwordAccountState, {
        email: 'janet@x.test',
      }),
    ).toEqual({ email: 'janet@x.test', accountId: null, verified: false })

    // Signing in, typed either way, reaches it (here: emails its code).
    vi.useFakeTimers()
    sent.length = 0
    for (const email of ['Jane@X.test', 'jane@x.test']) {
      vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
      expect(
        await signIn(t, { flow: 'signIn', email, password: 'correct horse' }),
      ).toEqual({ tokens: null })
    }
    expect(sent.map(e => e.to)).toEqual([['Jane@X.test'], ['Jane@X.test']])
  })

  it('reaches each of two accounts that differ in case by typing it exactly', async () => {
    const t = convexTest(schema, modules)
    const ids = await t.run(async ctx => {
      const insert = async (email: string) => {
        const userId = await ctx.db.insert('users', { email })
        return await ctx.db.insert('authAccounts', {
          userId,
          provider: 'password',
          providerAccountId: email,
        })
      }
      return {
        upper: await insert('Twin@X.test'),
        lower: await insert('twin@x.test'),
      }
    })
    const state = (email: string) =>
      t.query(internal.functions.users.passwordAccountState, { email })
    expect(await state('Twin@X.test')).toMatchObject({ accountId: ids.upper })
    expect(await state('twin@x.test')).toMatchObject({ accountId: ids.lower })
    expect(await state('TWIN@x.test')).toMatchObject({ accountId: ids.lower })
  })

  it('doesn’t sign up a second account for one stored with capitals', async () => {
    const t = convexTest(schema, modules)
    await verifiedAccount(t, 'jane@x.test')
    await storeAs(t, 'jane@x.test', 'Jane@X.test')
    await signUp(t, 'ann@x.test')
    await storeAs(t, 'ann@x.test', 'Ann@X.test')
    const accounts = () =>
      t.run(async ctx =>
        (await ctx.db.query('authAccounts').collect()).map(
          a => a.providerAccountId,
        ),
      )
    const before = await accounts()

    expect(
      (await errorOf(signUp(t, 'jane@x.test', 'another password'))).data,
    ).toMatchObject({ code: 'EMAIL_IN_USE' })
    expect(
      (await errorOf(signUp(t, 'ann@x.test', 'another password'))).data,
    ).toMatchObject({ code: 'EMAIL_IN_USE' })
    // Unverified, with its password: its code again, not a new account.
    vi.useFakeTimers()
    vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
    sent.length = 0
    expect(await signUp(t, 'ANN@x.test')).toEqual({ tokens: null })
    expect(sent.map(e => e.to)).toEqual([['Ann@X.test']])
    expect(await accounts()).toEqual(before)
  })
})

describe('password reset requests (W-S6)', () => {
  it('answers the same for unknown addresses and sends nothing', async () => {
    const t = convexTest(schema, modules)
    await verifiedAccount(t, 'jane@x.test')
    sent.length = 0
    const known = await signIn(t, {
      flow: 'reset',
      email: 'jane@x.test',
      redirectTo: '/reset-password',
    })
    const unknown = await signIn(t, {
      flow: 'reset',
      email: 'nobody@x.test',
      redirectTo: '/reset-password',
    })
    expect(unknown).toEqual(known)
    expect(sent.map(e => e.to)).toEqual([['jane@x.test']])
  })

  it('throttles reset emails per address', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    await verifiedAccount(t, 'jane@x.test')
    sent.length = 0
    const reset = (email = 'jane@x.test') =>
      signIn(t, { flow: 'reset', email, redirectTo: '/reset-password' })

    await reset()
    const error = await errorOf(reset('JANE@x.test'))
    expect(error.data).toMatchObject({ code: 'TOO_MANY_REQUESTS' })

    vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
    await reset()
    expect(sent).toHaveLength(2)
  })

  it('stores nothing for addresses without an account', async () => {
    const t = convexTest(schema, modules)
    for (let i = 0; i < 3; i++) {
      await signIn(t, {
        flow: 'reset',
        email: `nobody${i}@x.test`,
        redirectTo: '/reset-password',
      })
      await signIn(t, { flow: 'reset', email: `nobody${i}@x.test` })
    }
    expect(sent).toEqual([])
    expect(await throttleRows(t)).toEqual([])
    expect(await scheduledJobs(t)).toEqual([])
  })

  it('can’t lock the owner out by requesting links for their address', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    await verifiedAccount(t, 'jane@x.test')
    // Past the hour the sign-up's code counts in.
    vi.advanceTimersByTime(AUTH_EMAIL_WINDOW_MS)
    sent.length = 0
    const reset = () =>
      signIn(t, {
        flow: 'reset',
        email: 'jane@x.test',
        redirectTo: '/reset-password',
      })

    // Someone else, once a minute.
    for (let i = 0; i < AUTH_EMAILS_PER_WINDOW; i++) {
      await reset()
      vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
    }
    expect(sent).toHaveLength(AUTH_EMAILS_PER_WINDOW)
    const lastCode = await t.run(ctx =>
      ctx.db.query('authVerificationCodes').unique(),
    )

    // The owner is answered as if sent, and the last link (in their inbox)
    // keeps working: it isn't replaced.
    for (let i = 0; i < 5; i++) {
      await reset()
      vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
    }
    expect(sent).toHaveLength(AUTH_EMAILS_PER_WINDOW)
    expect(
      await t.run(ctx => ctx.db.query('authVerificationCodes').unique()),
    ).toEqual(lastCode)
  })
})

describe('alternating reset links and verification codes (D-A2)', () => {
  it('can’t get past the hourly cap by asking for each in turn', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    // Someone signs the address up with a password of their own, then asks
    // for a reset link and a new code, each once a minute. An account holds
    // one code at a time: each link replaced the code and each code the
    // link, so each request found the last one of its kind gone and sent
    // another — 361 emails in three hours.
    await signUp(t, 'victim@x.test')
    const hours = 3
    for (let minute = 0; minute < hours * 60; minute++) {
      vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
      await signIn(t, {
        flow: 'reset',
        email: 'victim@x.test',
        redirectTo: '/reset-password',
      })
      await t.action(api.functions.users.resendVerificationCode, {
        email: 'victim@x.test',
      })
    }
    // Ten an hour for both kinds together, plus one each time the last one
    // of a kind expired: codes last 15 minutes, links an hour.
    const perHour = AUTH_EMAILS_PER_WINDOW + 60 / 15 + 60 / 60
    expect(sent.length).toBeLessThanOrEqual(hours * perHour)
  })

  it('counts both kinds together, and a link past the cap doesn’t replace the code', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    const reset = () =>
      signIn(t, {
        flow: 'reset',
        email: 'jane@x.test',
        redirectTo: '/reset-password',
      })
    const resend = () =>
      t.action(api.functions.users.resendVerificationCode, {
        email: 'jane@x.test',
      })
    // The sign-up's code, five links and four more codes.
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
      await reset()
      if (i > 0) expect(await resend()).toEqual({ status: 'sent' })
    }
    expect(sent).toHaveLength(AUTH_EMAILS_PER_WINDOW)
    const code = await t.run(ctx =>
      ctx.db.query('authVerificationCodes').unique(),
    )

    // Capped while the last of each kind works. A link would replace the
    // owner's code, so none goes out.
    vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
    await reset()
    expect(await resend()).toEqual({ status: 'reused' })
    expect(sent).toHaveLength(AUTH_EMAILS_PER_WINDOW)
    expect(
      await t.run(ctx => ctx.db.query('authVerificationCodes').unique()),
    ).toEqual(code)
  })
})

describe('resending the verification code (W-H6)', () => {
  it('sends a code without a password, and not as a failed sign-in', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    const firstCode = sent[0].subject.slice(0, 6)
    vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)

    expect(
      await t.action(api.functions.users.resendVerificationCode, {
        email: 'Jane@x.test',
      }),
    ).toEqual({ status: 'sent' })
    expect(sent).toHaveLength(2)
    expect(sent[1].to).toEqual(['jane@x.test'])
    expect(sent[1].subject.slice(0, 6)).toMatch(/^\d{6}$/)
    expect(sent[1].subject).not.toBe(sent[0].subject.replace(firstCode, ''))
    expect(
      await t.run(ctx => ctx.db.query('authRateLimits').collect()),
    ).toEqual([])

    // Once a minute.
    const error = await errorOf(
      t.action(api.functions.users.resendVerificationCode, {
        email: 'jane@x.test',
      }),
    )
    expect(error.data).toMatchObject({ code: 'TOO_MANY_REQUESTS' })
    expect(sent).toHaveLength(2)
  })

  it('answers “sent” for addresses with nothing to verify, and stores nothing for them', async () => {
    const t = convexTest(schema, modules)
    await verifiedAccount(t, 'done@x.test')
    await t.run(async ctx => {
      for (const row of await ctx.db.query('authEmailThrottles').collect()) {
        await ctx.db.delete(row._id)
      }
    })
    sent.length = 0
    for (const email of ['nobody@x.test', 'other@x.test', 'done@x.test']) {
      for (let i = 0; i < 2; i++) {
        // As for an address a code went to: this doesn't tell who has an
        // account.
        expect(
          await t.action(api.functions.users.resendVerificationCode, {
            email,
          }),
        ).toEqual({ status: 'sent' })
        await signIn(t, { flow: 'email-verification', email })
        await signIn(t, { flow: 'signIn', email, password: '' })
      }
    }
    expect(sent).toEqual([])
    expect(await throttleRows(t)).toEqual([])
    expect(await scheduledJobs(t)).toEqual([])
  })

  it('sends a new code past the hourly cap once the last one expired', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    const resend = () =>
      t.action(api.functions.users.resendVerificationCode, {
        email: 'jane@x.test',
      })
    for (let i = 1; i < AUTH_EMAILS_PER_WINDOW; i++) {
      vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
      expect(await resend()).toEqual({ status: 'sent' })
    }
    expect(sent).toHaveLength(AUTH_EMAILS_PER_WINDOW)

    // Capped while the last code works: nothing is sent, and the page says
    // to use that code rather than wait for a new one.
    vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)
    expect(await resend()).toEqual({ status: 'reused' })
    expect(sent).toHaveLength(AUTH_EMAILS_PER_WINDOW)

    // Verification codes last 15 minutes; then the owner gets a new one.
    vi.advanceTimersByTime(15 * 60 * 1000)
    expect(await resend()).toEqual({ status: 'sent' })
    expect(sent).toHaveLength(AUTH_EMAILS_PER_WINDOW + 1)
  })

  it('throttles the library’s own password-less resend flow too', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    const error = await errorOf(
      signIn(t, { flow: 'email-verification', email: 'jane@x.test' }),
    )
    expect(error.data).toMatchObject({ code: 'TOO_MANY_REQUESTS' })
    expect(sent).toHaveLength(1)
  })

  it('makes released builds’ empty-password resend send a code, not fail a sign-in', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    vi.advanceTimersByTime(AUTH_EMAIL_COOLDOWN_MS)

    await signIn(t, { flow: 'signIn', email: 'jane@x.test', password: '' })
    expect(sent.map(e => e.to)).toEqual([['jane@x.test'], ['jane@x.test']])
    expect(
      await t.run(ctx => ctx.db.query('authRateLimits').collect()),
    ).toEqual([])
  })

  it('lets a repeated sign-up through without a second email inside the cooldown', async () => {
    const t = convexTest(schema, modules)
    await signUp(t, 'jane@x.test')
    // Same password: the code sent a moment ago still works.
    expect(await signUp(t, 'jane@x.test')).toEqual(await signUp(t, 'z@x.test'))
    expect(sent.map(e => e.to)).toEqual([['jane@x.test'], ['z@x.test']])
  })
})

describe('authEmailSendDecision', () => {
  const CODE_MS = 15 * 60 * 1000
  const LINK_MS = 60 * 60 * 1000
  type State = { windowStart: number; count: number; lastSentAt: number }
  const after = (state: State | undefined, now: number): State =>
    state && now - state.windowStart < AUTH_EMAIL_WINDOW_MS
      ? { ...state, count: state.count + 1, lastSentAt: now }
      : { windowStart: now, count: 1, lastSentAt: now }

  it('allows one email a minute and ten an hour while the last one works', () => {
    const start = 1_000_000
    let verify: State | undefined
    let now = start
    for (let i = 0; i < AUTH_EMAILS_PER_WINDOW; i++) {
      const decision = authEmailSendDecision('verify', { verify }, now, CODE_MS)
      expect(decision.action).toBe('send')
      verify = after(verify, now)
      expect(
        authEmailSendDecision('verify', { verify }, now + 1000, CODE_MS),
      ).toEqual({ action: 'wait', retryAfterMs: AUTH_EMAIL_COOLDOWN_MS - 1000 })
      now += AUTH_EMAIL_COOLDOWN_MS
    }
    expect(AUTH_EMAILS_PER_WINDOW).toBe(10)
    expect(authEmailSendDecision('verify', { verify }, now, CODE_MS)).toEqual({
      action: 'reuse',
    })
    // The owner never ends up without a working code: once the last one
    // expired (codes last 15 minutes), a new one goes out.
    const expired = now - AUTH_EMAIL_COOLDOWN_MS + CODE_MS
    expect(
      authEmailSendDecision('verify', { verify }, expired, CODE_MS),
    ).toEqual({ action: 'send', newWindow: false })
    expect(
      authEmailSendDecision(
        'verify',
        { verify },
        start + AUTH_EMAIL_WINDOW_MS,
        CODE_MS,
      ),
    ).toEqual({ action: 'send', newWindow: true })
  })

  it('counts both kinds together, and waits a minute per kind', () => {
    const now = 1_000_000
    const verify: State = { windowStart: now, count: 6, lastSentAt: now }
    const reset: State = { windowStart: now, count: 4, lastSentAt: now }
    const later = now + AUTH_EMAIL_COOLDOWN_MS
    // One kind right after the other: the minute is per kind.
    expect(
      authEmailSendDecision('reset', { verify }, now + 1000, LINK_MS),
    ).toEqual({ action: 'send', newWindow: true })
    // Ten of both together is the cap, for each kind.
    expect(
      authEmailSendDecision('verify', { verify, reset }, later, CODE_MS),
    ).toEqual({ action: 'reuse' })
    expect(
      authEmailSendDecision('reset', { verify, reset }, later, LINK_MS),
    ).toEqual({ action: 'reuse' })
    // A kind with nothing valid gets one: here, no link was ever sent.
    expect(
      authEmailSendDecision(
        'reset',
        { verify: { ...verify, count: 10 } },
        later,
        LINK_MS,
      ),
    ).toEqual({ action: 'send', newWindow: true })
    // Each by its own last send: the code expires before the link.
    const inHalfAnHour = now + 30 * 60 * 1000
    expect(
      authEmailSendDecision('verify', { verify, reset }, inHalfAnHour, CODE_MS),
    ).toEqual({ action: 'send', newWindow: false })
    expect(
      authEmailSendDecision('reset', { verify, reset }, inHalfAnHour, LINK_MS),
    ).toEqual({ action: 'reuse' })
  })
})

describe('deleting an account releases the email (M29)', () => {
  it('makes signing up again during the cascade a new account', async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    const oldUser = await verifiedAccount(t, 'jane@x.test')
    await t
      .withIdentity({ subject: oldUser })
      .mutation(api.functions.users.deleteAccount, {})
    expect((await t.run(ctx => ctx.db.get(oldUser)))?.email).toBeUndefined()

    // Nothing about the address is kept, its email throttle included.
    expect(await throttleRows(t)).toEqual([])

    // The cascade hasn't run yet.
    await signUp(t, 'jane@x.test')
    const account = await t.run(ctx => ctx.db.query('authAccounts').unique())
    expect(account?.userId).toBeDefined()
    expect(account?.userId).not.toBe(oldUser)
  })
})
