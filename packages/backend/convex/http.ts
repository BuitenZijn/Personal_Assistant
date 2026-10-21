import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { auth } from './auth'
import {
  RESET_PASSWORD_PATH,
  appResetLink,
  escapeHtml,
} from './lib/passwordResetLinks'

const http = httpRouter()

auth.addHttpRoutes(http)

/**
 * The page the password-reset email links to. It only forwards the email and
 * code to the app (see lib/passwordResetLinks.ts); the reset itself happens
 * in the app. A tap on the button is a user gesture, which some browsers
 * need before they open another app.
 */
http.route({
  path: `/${RESET_PASSWORD_PATH}`,
  method: 'GET',
  handler: httpAction(async (_ctx, request) => {
    const params = new URL(request.url).searchParams
    const email = params.get('email')?.trim()
    const code = params.get('code')?.trim()
    if (!email || !code) {
      return new Response('This reset link is incomplete.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const href = escapeHtml(appResetLink(email, code))
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <title>Reset your password</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 48px 20px; text-align: center; color: #1a1a1a;">
    <h1 style="font-size: 24px;">Reset your password</h1>
    <p style="color: #4a4a4a; line-height: 1.5;">Open Personal Assistant on this phone to choose a new password.</p>
    <p style="margin-top: 32px;">
      <a href="${href}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700;">Open Personal Assistant</a>
    </p>
  </body>
</html>`
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }),
})

export default http
