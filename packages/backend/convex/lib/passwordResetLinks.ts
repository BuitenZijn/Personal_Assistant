/**
 * Links for the password-reset email.
 *
 * The mobile app requests `personalassistant://reset-password?...` links, but
 * most mail clients won't open a custom scheme. The pressable link therefore
 * goes to the deployment's own `/reset-password` page (see http.ts), an
 * https URL every mail client opens, which hands the same email + code to the
 * app. The app link stays available as a secondary option.
 */

/** The app's URL scheme; must match `scheme` in apps/mobile/app.json. */
export const APP_SCHEME = 'personalassistant'

/** The path of the reset page, both on the Convex site and in the app link. */
export const RESET_PASSWORD_PATH = 'reset-password'

export interface PasswordResetLinks {
  /** The link the button and copy-paste text use: http(s) when possible. */
  primary: string
  /** Deep link into the app, when the reset was requested from the app. */
  app?: string
}

export function passwordResetLinks({
  url,
  token,
  email,
  siteUrl,
}: {
  /** The URL @convex-dev/auth built from `redirectTo` plus `code`. */
  url: string
  token: string
  email: string
  /** The deployment's HTTP actions URL (`CONVEX_SITE_URL`). */
  siteUrl?: string
}): PasswordResetLinks {
  if (!url.startsWith(`${APP_SCHEME}:`) || !siteUrl) return { primary: url }

  const page = new URL(`${siteUrl.replace(/\/$/, '')}/${RESET_PASSWORD_PATH}`)
  page.searchParams.set('email', email)
  page.searchParams.set('code', token)
  return { primary: page.toString(), app: url }
}

/** The app link the reset page opens, from the email and code it was given. */
export function appResetLink(email: string, code: string): string {
  const link = new URL(`${APP_SCHEME}://${RESET_PASSWORD_PATH}`)
  link.searchParams.set('email', email)
  link.searchParams.set('code', code)
  return link.toString()
}

/** Escape a value for use inside HTML text or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
