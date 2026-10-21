/**
 * Convex Auth configuration
 * Using Password provider for email/password authentication
 */

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
}
