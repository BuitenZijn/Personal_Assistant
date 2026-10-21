/**
 * Shared TypeScript types for Convex functions
 *
 * Document types come from the schema via Doc<T>; composite types describe
 * joined query results. Each ported feature adds its types here.
 */

import type { Doc, Id } from '../_generated/dataModel'

// ============================================================================
// Document Types
// ============================================================================

export type User = Doc<'users'>

/** User with resolved image URL - returned by users.me query */
export type UserWithImageUrl = User & { imageUrl: string | null }

// ============================================================================
// Composite Types
// ============================================================================

/**
 * User item for filter dropdowns (admin only)
 * Returned by users.listForFilter
 */
export interface UserFilterItem {
  _id: Id<'users'>
  name: string
}
