import { useQuery } from 'convex/react'
import { api } from '@pa/backend/api'
import { useCallback, useMemo } from 'react'

/**
 * Hook to access the current user's profile and permissions.
 *
 * Queries `users.me` reactively so the result stays up-to-date.
 * Use `hasPermission()` for fine-grained access checks.
 *
 * This is the only hook that reads `users.me`. There used to be a second one
 * (`useUserIdentity`) doing the same query with a different return shape,
 * which meant two subscriptions and two ideas of what a user's display name
 * is.
 */
export function useCurrentUser() {
  const data = useQuery(api.functions.users.me)

  const user = data?.user ?? null

  // Memoised so `hasPermission` keeps a stable identity: a fresh array every
  // render makes every dependent callback and effect re-run.
  const permissions = useMemo(
    () => (data?.effectivePermissions ?? []) as string[],
    [data?.effectivePermissions],
  )

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  )

  return {
    /** Full user document (null while loading) */
    user,
    /** Profile image URL */
    imageUrl: data?.imageUrl ?? null,
    /**
     * Name to show in the UI. Falls back through first name → email local
     * part → a generic label, so it is never empty.
     */
    displayName: user?.firstName || user?.email?.split('@')[0] || 'Player',
    /** Server-computed effective permissions (role + overrides) */
    permissions,
    /** Check if current user has a specific permission */
    hasPermission,
    /** True while the query is still loading */
    isLoading: data === undefined,
  } as const
}
