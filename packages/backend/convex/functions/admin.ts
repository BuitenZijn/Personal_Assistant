/**
 * Admin Functions
 *
 * Read-only configuration the admin pages need. User management itself lives
 * in users.ts.
 */

import { query } from '../_generated/server'
import { getCurrentUser } from '../lib/auth'
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../lib/permissions'

/**
 * Get permissions configuration.
 * Returns all permissions grouped by domain and role mappings.
 * Available to any authenticated user (the data is not sensitive).
 */
export const getPermissionsConfig = query({
  args: {},
  handler: async ctx => {
    await getCurrentUser(ctx)

    return {
      allPermissions: [...ALL_PERMISSIONS] as string[],
      permissions: Object.fromEntries(
        Object.entries(PERMISSIONS).map(([domain, perms]) => [
          domain,
          Object.values(perms) as string[],
        ]),
      ),
      rolePermissions: Object.fromEntries(
        Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => [
          role,
          [...perms] as string[],
        ]),
      ),
    }
  },
})
