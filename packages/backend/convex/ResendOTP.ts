/**
 * Resend Email Provider for Email Verification
 *
 * Sends a 6-digit verification code to verify email addresses during sign-up.
 * Uses Resend for email delivery.
 *
 * Based on: https://labs.convex.dev/auth/config/passwords#email-verification-setup
 */

import { Email } from '@convex-dev/auth/providers/Email'
import { Resend as ResendAPI } from 'resend'

import { DEFAULT_EMAIL_FROM } from './lib/auth'
import { generateRandomString } from './lib/random'

/**
 * ResendOTP provider for email verification during sign-up.
 * Generates a 6-digit numeric code and sends it via Resend.
 */
export const ResendOTP = Email({
  id: 'resend-otp',
  apiKey: process.env.AUTH_RESEND_KEY,
  // Token valid for 15 minutes (short-lived code)
  maxAge: 60 * 15,

  async generateVerificationToken() {
    return generateRandomString(6, '0123456789')
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey)

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
      to: [email],
      subject: `${token} is your Personal Assistant verification code`,
      html: `
        <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
          Your verification code is ${token}
        </div>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4EB54A; font-size: 28px; margin: 0;">Personal Assistant</h1>
          </div>

          <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Your verification code</h2>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Enter this code to confirm your email address:
          </p>

          <div style="text-align: center; margin-bottom: 32px;">
            <span style="display: inline-block; background: #f5f5f5; border: 2px solid #4EB54A; border-radius: 12px; padding: 16px 40px; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; font-family: monospace;">
              ${token}
            </span>
          </div>

          <p style="color: #6a6a6a; font-size: 14px; line-height: 1.5; margin-top: 24px;">
            This code expires in 15 minutes. Didn't create a Personal Assistant account? You can ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />

          <p style="color: #9a9a9a; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Personal Assistant
          </p>
        </div>
      `,
      text: `Your Personal Assistant verification code is: ${token}\n\nEnter this code to confirm your email address.\n\nThis code expires in 15 minutes. Didn't create a Personal Assistant account? You can ignore this email.`,
    })

    if (error) {
      console.error('Failed to send verification email:', error)
      throw new Error('Could not send verification email')
    }
  },
})
