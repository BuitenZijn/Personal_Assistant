import React from 'react'
import { ShoppingBasket } from 'lucide-react-native'
import { AppShell } from '../../../components/shell'
import { EmptyState, emptyStateIconColor } from '../../../components/kit'
import { useCurrentUser } from '../../../lib/useCurrentUser'

/**
 * The home tab. Empty for now: the weekly plan and basket land here in the
 * later phases (see docs/PLAN.md).
 */
export function HomeScreen() {
  const { user, displayName } = useCurrentUser()

  return (
    <AppShell title='Home' showBack={false}>
      <EmptyState
        icon={<ShoppingBasket size={30} color={emptyStateIconColor} />}
        title={user ? `Welcome, ${displayName}` : 'Welcome'}
        description='Your weekly dinners and shopping basket will show up here.'
      />
    </AppShell>
  )
}
