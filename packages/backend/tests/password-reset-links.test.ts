/// <reference types="vite/client" />
/**
 * Password-reset emails for app requests must link to an https page: many
 * mail clients won't open the `personalassistant://` scheme. The page lives on
 * the deployment itself (http.ts) and hands the email and code to the app.
 */
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import schema from '../convex/schema'
import { ResendOTPPasswordReset } from '../convex/ResendOTPPasswordReset'
import {
  appResetLink,
  escapeHtml,
  passwordResetLinks,
} from '../convex/lib/passwordResetLinks'

const modules = import.meta.glob('../convex/**/*.ts')

const { sent } = vi.hoisted(() => ({
  sent: [] as { html: string; text: string }[],
}))
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: { html: string; text: string }) => {
        sent.push(payload)
        return { error: null }
      },
    }
  },
}))

afterEach(() => {
  vi.unstubAllEnvs()
})

const token = 'AbC123xyz'
const email = 'player+test@example.com'
const siteUrl = 'https://example.convex.site'
const appUrl = `personalassistant://reset-password?email=${encodeURIComponent(email)}&code=${token}`

describe('passwordResetLinks', () => {
  it('points app requests at the reset page with the same email and code', () => {
    const links = passwordResetLinks({ url: appUrl, token, email, siteUrl })
    const page = new URL(links.primary)
    expect(page.origin).toBe(siteUrl)
    expect(page.pathname).toBe('/reset-password')
    expect(page.searchParams.get('email')).toBe(email)
    expect(page.searchParams.get('code')).toBe(token)
    expect(links.app).toBe(appUrl)
  })

  it('ignores a trailing slash on the site URL', () => {
    const links = passwordResetLinks({
      url: appUrl,
      token,
      email,
      siteUrl: `${siteUrl}/`,
    })
    expect(links.primary.startsWith(`${siteUrl}/reset-password?`)).toBe(true)
  })

  it('falls back to the app link when there is no site URL', () => {
    expect(passwordResetLinks({ url: appUrl, token, email })).toEqual({
      primary: appUrl,
    })
  })

  it('leaves website requests untouched', () => {
    const url = `http://localhost:3000/reset-password?email=${encodeURIComponent(email)}&code=${token}`
    expect(passwordResetLinks({ url, token, email, siteUrl })).toEqual({
      primary: url,
    })
  })
})

describe('escapeHtml', () => {
  it('makes a link safe inside an href attribute', () => {
    expect(escapeHtml('https://x.test/?a=1&b="2"<')).toBe(
      'https://x.test/?a=1&amp;b=&quot;2&quot;&lt;',
    )
  })
})

describe('password reset email', () => {
  async function send(url: string) {
    sent.length = 0
    await ResendOTPPasswordReset.sendVerificationRequest!({
      identifier: email,
      provider: { apiKey: 'test' },
      url,
      token,
      expires: new Date(),
    } as never)
    return sent[0]
  }

  it('makes the button open the reset page for app requests', async () => {
    vi.stubEnv('CONVEX_SITE_URL', siteUrl)
    const { html, text } = await send(appUrl)
    const buttonHref = html
      .match(/<a href="([^"]+)"/)![1]
      .replace(/&amp;/g, '&')
    const page = new URL(buttonHref)
    expect(page.origin).toBe(siteUrl)
    expect(page.pathname).toBe('/reset-password')
    expect(page.searchParams.get('code')).toBe(token)
    expect(page.searchParams.get('email')).toBe(email)
    // The app link is still offered, but only as the secondary option.
    expect(html).toContain('href="personalassistant://reset-password')
    expect(text.indexOf(buttonHref)).toBeLessThan(text.indexOf(appUrl))
  })
})

describe('reset page', () => {
  it('links to the app with the email and code', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch(
      `/reset-password?email=${encodeURIComponent(email)}&code=${token}`,
    )
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain(`href="${escapeHtml(appResetLink(email, token))}"`)
  })

  it('escapes what it puts in the page', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch(
      `/reset-password?email=${encodeURIComponent('"><script>x</script>')}&code=${token}`,
    )
    expect(await response.text()).not.toContain('<script>x')
  })

  it('refuses a link without a code', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch(
      `/reset-password?email=${encodeURIComponent(email)}`,
    )
    expect(response.status).toBe(400)
  })
})
