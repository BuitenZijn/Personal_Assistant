import { useEffect, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { useQueryState } from '../../lib/convex'
import { logger } from '../../lib/logger'

/** The current user's household, its members and open invites. */
export function useHousehold() {
  return useQueryState(api.functions.households.mine)
}

export type HouseholdData = NonNullable<ReturnType<typeof useHousehold>['data']>
export type HouseholdPerson = HouseholdData['household']['people'][number]

/**
 * Sets up a household the first time a user signs in (see docs/PLAN.md,
 * Phase 1). Mounted once, above the tabs. Someone invited to another
 * household joins it from the Household tab, which leaves this one.
 */
export function useEnsureHousehold() {
  const household = useHousehold()
  const setUp = useMutation(api.functions.households.setUp)
  const requested = useRef(false)

  const missing = household.status === 'ready' && household.data === null
  useEffect(() => {
    if (!missing || requested.current) return
    requested.current = true
    setUp().catch(error => {
      // The Household tab keeps loading; the next app start tries again.
      requested.current = false
      logger.warn('Household', 'Could not set up a household', { error })
    })
  }, [missing, setUp])
}
