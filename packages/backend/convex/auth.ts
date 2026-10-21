/**
 * Convex Auth Setup
 * Using Password provider for email/password authentication
 * with email verification and password reset via Resend
 */

import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth, retrieveAccount } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import { internal } from './_generated/api'
import { ResendOTP } from './ResendOTP'
import { ResendOTPPasswordReset } from './ResendOTPPasswordReset'
import {
  MIN_PASSWORD_LENGTH,
  authError,
  requireAuthEmail,
  tooManyAuthEmailsError,
  type AuthEmailKind,
} from './lib/auth'
import { APP_SCHEME, RESET_PASSWORD_PATH } from './lib/passwordResetLinks'

function validatePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw authError(
      'INVALID_PASSWORD',
      `Invalid password: use at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  }
}

/** The param that holds the password, for the flows that take one. */
function passwordParamOf(flow: string | undefined) {
  if (flow === 'signIn' || flow === 'signUp') return 'password'
  if (flow === 'reset-verification') return 'newPassword'
  return null
}

function emailInUseError() {
  return authError(
    'EMAIL_IN_USE',
    'An account with this email address already exists. Sign in instead.',
  )
}

/**
 * The profile the library stores for each flow. `params.email` arrives
 * normalised by the authorize wrapper below (see `passwordAccountState`),
 * which also hands it to the code-verification providers.
 *
 * Only strings are taken: `String(['jane@x.com'])` is `'jane@x.com'`.
 */
function passwordProfile(params: Record<string, unknown>) {
  const email = typeof params.email === 'string' ? params.email : ''
  const flow = params.flow as string | undefined
  if (!email) {
    throw authError('INVALID_ARGUMENT', 'Enter your email address.')
  }

  // Only add firstName/lastName for sign-up flow
  if (flow === 'signUp') {
    const name = (value: unknown) =>
      typeof value === 'string' ? value.trim() : ''
    const firstName = name(params.firstName)
    const lastName = name(params.lastName)

    if (!firstName || !lastName) {
      throw authError('INVALID_ARGUMENT', 'Enter your first and last name.')
    }

    return {
      email,
      firstName,
      lastName,
      role: 'user',
    } as { email: string } & Record<string, string>
  }

  // Sign-in flow
  return {
    email,
    role: 'user',
  } as { email: string } & Record<string, string>
}

/**
 * Turn the library's uncoded errors into messages a person can act on.
 * Production replaces the message of a plain `Error` with "Server Error";
 * the apps show these messages and branch on their codes.
 */
function toAuthError(error: unknown, flow: string | undefined): unknown {
  if (error instanceof ConvexError) return error
  const message = error instanceof Error ? error.message : String(error)
  const verifiesCode =
    flow === 'email-verification' || flow === 'reset-verification'

  if (message.includes('TooManyFailedAttempts')) {
    return authError(
      'TOO_MANY_REQUESTS',
      'Too many failed attempts. Wait a few minutes and try again, or reset your password.',
    )
  }
  if (message.includes('already exists')) return emailInUseError()
  if (message.includes('Invalid password')) {
    return authError(
      'INVALID_PASSWORD',
      `Invalid password: use at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  }
  if (
    message.includes('Could not verify code') ||
    message.includes('Invalid code') ||
    (verifiesCode &&
      (message.includes('InvalidAccountId') ||
        message.includes('Could not find')))
  ) {
    return authError(
      'INVALID_CODE',
      flow === 'reset-verification'
        ? 'Invalid or expired reset link. Request a new one.'
        : 'Invalid or expired code. Request a new one.',
    )
  }
  // An unknown email and a wrong password look the same, so sign-in doesn't
  // reveal which addresses have accounts.
  if (
    message.includes('InvalidAccountId') ||
    message.includes('InvalidSecret') ||
    message.includes('Invalid credentials') ||
    message.includes('Could not find')
  ) {
    return authError(
      'INVALID_CREDENTIALS',
      'Invalid email address or password.',
    )
  }
  return error
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  callbacks: {
    async redirect({ redirectTo }) {
      // Password-reset emails requested by the native app return directly to
      // the app. Keep the allow-list deliberately narrow: no other custom
      // scheme destination is accepted.
      if (redirectTo.startsWith(`${APP_SCHEME}://${RESET_PASSWORD_PATH}`)) {
        const destination = new URL(redirectTo)
        if (
          destination.protocol === `${APP_SCHEME}:` &&
          destination.hostname === RESET_PASSWORD_PATH
        ) {
          return destination.toString()
        }
      }

      const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(
        /\/$/,
        '',
      )
      if (redirectTo.startsWith('/') || redirectTo.startsWith('?')) {
        return `${siteUrl}${redirectTo}`
      }
      if (redirectTo === siteUrl || redirectTo.startsWith(`${siteUrl}/`)) {
        return redirectTo
      }
      throw new Error('Invalid authentication redirect destination')
    },
  },
  providers: [
    (() => {
      const provider = Password({
        // Enable email verification during sign-up
        verify: ResendOTP,
        // Enable password reset via email
        reset: ResendOTPPasswordReset,
        validatePasswordRequirements: validatePassword,
        profile: passwordProfile,
      })

      /**
       * Every password flow passes through here:
       * - the address, and the password where the flow takes one, must be
       *   strings (see `requireAuthEmail`): `params` is whatever the caller
       *   sent, and the library turns an address in an array into the
       *   address, past every check below;
       * - the address is looked up whatever its case, and the library gets
       *   the stored form, or for a new account the normalised one (lower
       *   case, trimmed) — see `passwordAccountState`;
       * - flows that email someone are throttled per address;
       * - a password is only checked through the library's sign-in check,
       *   which locks an account after too many wrong ones;
       * - errors are coded, and sign-in doesn't reveal whether an account
       *   exists.
       *
       * `Password()` keeps its real `authorize` in `options`, which the
       * library merges over the provider's own (a stub returning null) when
       * it loads the provider — wrapping `provider.authorize` does nothing.
       */
      const options = (
        provider as unknown as {
          options: Required<Pick<typeof provider, 'authorize'>>
        }
      ).options
      const originalAuthorize = options.authorize
      options.authorize = async (params, ctx) => {
        const flow = typeof params.flow === 'string' ? params.flow : undefined
        try {
          const email = requireAuthEmail(params.email)
          const passwordParam = passwordParamOf(flow)
          if (
            passwordParam !== null &&
            typeof params[passwordParam] !== 'string'
          ) {
            throw authError('INVALID_ARGUMENT', 'Enter your password.')
          }
          const account = await ctx.runQuery(
            internal.functions.users.passwordAccountState,
            { email },
          )
          const unverified = account.accountId !== null && !account.verified

          /**
           * Count an email about to go to the address: `send` it, `wait`
           * (one of its kind went out less than a minute ago), or `reuse`
           * the last one of its kind sent, which still works. See
           * `authEmailSendDecision`.
           */
          const claimEmail = (kind: AuthEmailKind) =>
            ctx.runMutation(internal.functions.users.claimAuthEmailSend, {
              email: account.email,
              kind,
            })
          /**
           * For a request for an email: whether to send one. Asking again
           * within a minute is refused.
           */
          const requireEmailClaim = async (kind: AuthEmailKind) => {
            const claim = await claimEmail(kind)
            if (claim.action === 'wait') {
              throw tooManyAuthEmailsError(claim.retryAfterMs)
            }
            return claim.action === 'send'
          }
          /**
           * Check the password of the address's account through the
           * library's sign-in check, which counts wrong passwords and locks
           * the account after too many.
           */
          const checkPassword = () =>
            retrieveAccount(ctx, {
              provider: 'password',
              // A string: checked above.
              account: { id: account.email, secret: params.password as string },
            })

          // Released app builds (and web pages cached from before the
          // `resendVerificationCode` action) ask for a new code by signing in
          // with an empty password. No password is empty, so treat that as
          // the resend it means instead of a failed sign-in.
          const legacyResend = flow === 'signIn' && params.password === ''

          // Reset and resend-code requests need no password. An address with
          // nothing to send to gets the same empty answer, and nothing is
          // stored for it (see `resendVerificationCode`).
          if (flow === 'reset') {
            if (account.accountId === null) return null
            if (!(await requireEmailClaim('reset'))) return null
          } else if (
            legacyResend ||
            (flow === 'email-verification' && params.code === undefined)
          ) {
            if (!unverified) return null
            if (!(await requireEmailClaim('verify'))) return null
            if (legacyResend) {
              return await originalAuthorize(
                { flow: 'email-verification', email: account.email },
                ctx,
              )
            }
          } else if (flow === 'signUp') {
            validatePassword(params.password)
            if (account.accountId === null) {
              // Names first: nothing is counted for a sign-up that fails.
              passwordProfile({ ...params, email: account.email })
              await requireEmailClaim('verify')
            } else if (account.verified) {
              // The library would check the password here, with no limit
              // on wrong ones: signing up was a way to guess the password of
              // any account. So the right password doesn't sign in here
              // either; the page says to sign in instead.
              throw emailInUseError()
            } else {
              // Signing up again with the password of an unverified account
              // re-sends its code; with another password, the address is
              // someone else's. Check which before counting an email.
              await checkPassword().catch((error: unknown) => {
                throw error instanceof Error &&
                  error.message.includes('InvalidSecret')
                  ? emailInUseError()
                  : error
              })
              // Not sent: the code sent before still works.
              if ((await claimEmail('verify')).action !== 'send') return null
            }
          } else if (flow === 'signIn' && unverified) {
            // Signing in to an unverified account emails it a code. Only
            // with its password, and not more often than the throttle
            // allows: the code sent before still works.
            await checkPassword()
            if ((await claimEmail('verify')).action !== 'send') return null
          }

          return await originalAuthorize(
            { ...params, email: account.email },
            ctx,
          )
        } catch (error) {
          throw toAuthError(error, flow)
        }
      }
      return provider
    })(),
  ],
})
