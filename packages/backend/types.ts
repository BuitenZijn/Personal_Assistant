/**
 * Shared types for the Personal Assistant app
 *
 * - Document types are derived from schema via Doc<T>
 * - Composite types are defined in lib/types.ts
 *
 * Import in apps:
 *   import type { User } from "@pa/backend/types";
 */

export type { User, UserWithImageUrl, UserFilterItem } from './convex/lib/types'

// Re-export Id for convenience
export type { Id } from './convex/_generated/dataModel'

// Permissions (pure logic — shared between backend & apps)
export {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
} from './convex/lib/permissions'
export type { Permission, Role } from './convex/lib/permissions'
