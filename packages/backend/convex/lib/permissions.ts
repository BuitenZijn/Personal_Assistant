/**
 * Permission System — Single Source of Truth
 *
 * Permissions are colon-delimited `resource:action` strings.
 * Roles map to a set of permissions. Users inherit their role's
 * permissions plus any individual `permissionOverrides`.
 *
 * Each feature adds its own permissions here (e.g. `recipes:manage`), so
 * an admin can hand one person the running of one activity through an
 * override without making them an admin.
 */

// ============================================================================
// Permission Type
// ============================================================================

export const ALL_PERMISSIONS = [
  // Users
  'users:view-all',
  'users:manage',

  // Admin
  'admin:dashboard',
  'admin:view-roles',

  // Files
  'files:upload',
] as const

export type Permission = (typeof ALL_PERMISSIONS)[number]

// ============================================================================
// Permission Constants (grouped by domain for discoverability)
// ============================================================================

export const PERMISSIONS = {
  USERS: {
    VIEW_ALL: 'users:view-all' as const,
    MANAGE: 'users:manage' as const,
  },
  ADMIN: {
    DASHBOARD: 'admin:dashboard' as const,
    VIEW_ROLES: 'admin:view-roles' as const,
  },
  FILES: {
    UPLOAD: 'files:upload' as const,
  },
} as const

// ============================================================================
// Roles
// ============================================================================

export type Role = 'user' | 'admin'

const USER_PERMISSIONS: Permission[] = []

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: USER_PERMISSIONS,
  admin: [...ALL_PERMISSIONS],
} as const

// ============================================================================
// Permission Resolution
// ============================================================================

type UserDoc = {
  role?: string
  permissionOverrides?: string[]
  [key: string]: unknown
}

/**
 * Get the effective permissions for a user (role permissions + overrides).
 */
export function getEffectivePermissions(user: UserDoc): Permission[] {
  const role = (user.role ?? 'user') as Role
  const rolePerms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user
  const overrides = (user.permissionOverrides ?? []) as Permission[]

  // Deduplicate
  return [...new Set([...rolePerms, ...overrides])]
}

/**
 * Check if a user has a specific permission.
 */
export function hasPermission(user: UserDoc, permission: Permission): boolean {
  return getEffectivePermissions(user).includes(permission)
}

/**
 * Check if a user has at least one of the given permissions.
 */
export function hasAnyPermission(
  user: UserDoc,
  permissions: Permission[],
): boolean {
  const effective = getEffectivePermissions(user)
  return permissions.some(p => effective.includes(p))
}
