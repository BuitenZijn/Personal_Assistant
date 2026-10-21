/**
 * Resend Email Provider for Password Reset
 *
 * Sends a password reset link to reset user passwords.
 * Uses Resend for email delivery.
 *
 * Based on: https://labs.convex.dev/auth/config/passwords#email-reset-setup
 * Example: https://github.com/get-convex/convex-auth-example/blob/main/convex/passwordReset/ResendOTPPasswordReset.ts
 */

import { Email } from '@convex-dev/auth/providers/Email'
import { Resend as ResendAPI } from 'resend'

import { DEFAULT_EMAIL_FROM } from './lib/auth'
import { escapeHtml, passwordResetLinks } from './lib/passwordResetLinks'
import { generateRandomString } from './lib/random'

/**
 * ResendOTPPasswordReset provider for password reset flow.
 * Generates a secure token and sends a reset link via Resend.
 */
export const ResendOTPPasswordReset = Email({
  id: 'resend-otp-password-reset',
  apiKey: process.env.AUTH_RESEND_KEY,
  // Token valid for 1 hour (password reset should be quick)
  maxAge: 60 * 60,

  async generateVerificationToken() {
    // Generate a secure 32-character token for the link (alphanumeric)
    return generateRandomString(
      32,
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    )
  },

  async sendVerificationRequest({ identifier: email, provider, url, token }) {
    const resend = new ResendAPI(provider.apiKey)
    // App requests get an https link to press, with the app link as extra.
    const links = passwordResetLinks({
      url,
      token,
      email,
      siteUrl: process.env.CONVEX_SITE_URL,
    })
    const href = escapeHtml(links.primary)
    const appLinkHtml = links.app
      ? `
          <p style="color: #6a6a6a; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
            Button not working? <a href="${escapeHtml(links.app)}" style="color: #3A9A37;">Open the reset in the app directly</a>.
          </p>`
      : ''
    const appLinkText = links.app
      ? `\n\nOr open the reset in the app directly:\n${links.app}`
      : ''

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
      to: [email],
      subject: 'Reset your Personal Assistant password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4EB54A; font-size: 28px; margin: 0;">Personal Assistant</h1>
          </div>

          <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Reset your password</h2>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            We received a request to reset your Personal Assistant password. Open this email on the phone with the app and tap the button below to choose a new password:
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${href}" style="display: inline-block; background: #4EB54A; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px;">
              Choose a new password
            </a>
          </div>

          <p style="color: #6a6a6a; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
            Or copy this link into your phone's browser:
          </p>
          <p style="color: #4a4a4a; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 4px;">
            ${href}
          </p>
          ${appLinkHtml}

          <p style="color: #6a6a6a; font-size: 14px; line-height: 1.5; margin-top: 24px;">
            This link expires in 1 hour. Didn't ask for this? You can ignore this email; your password stays the same.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />

          <p style="color: #9a9a9a; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Personal Assistant
          </p>
        </div>
      `,
      text: `Reset your Personal Assistant password\n\nOpen the link below on the phone with the app to choose a new password:\n\n${links.primary}${appLinkText}\n\nThis link expires in 1 hour. Didn't ask for this? You can ignore this email; your password stays the same.`,
    })

    if (error) {
      console.error('Failed to send password reset email:', error)
      throw new Error('Could not send password reset email')
    }
  },
})
