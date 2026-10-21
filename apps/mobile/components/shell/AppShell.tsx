import React from 'react'
import { YStack } from '@pa/ui'
import { AppHeader } from './AppHeader'
import { TabHeader } from './TabHeader'

interface AppShellProps {
  children: React.ReactNode
  /** Title displayed in the header breadcrumb area */
  title?: string
  /** Show the header bar. Default: true */
  showHeader?: boolean
  /** Override back button visibility. Set false on tab root screens. */
  showBack?: boolean
  /** Optional action element rendered in the header's right area */
  rightAction?: React.ReactNode
}

/**
 * AppShell - Layout wrapper that adds header around screen content.
 *
 * The footer tab bar is rendered persistently by MainNavigator
 * and is no longer part of AppShell.
 *
 * Usage:
 * ```tsx
 * <AppShell title="Quests">
 *   {/* screen content *\/}
 * </AppShell>
 * ```
 */
export function AppShell({
  children,
  title,
  showHeader = true,
  showBack,
  rightAction,
}: AppShellProps) {
  return (
    <YStack flex={1} backgroundColor='$background'>
      {showHeader &&
        (showBack === false ? (
          // Tab roots get the Home-style wordmark row instead of the boxed bar.
          <TabHeader
            title={title ?? 'Personal Assistant'}
            rightAction={rightAction}
          />
        ) : (
          <AppHeader
            title={title}
            showBack={showBack}
            rightAction={rightAction}
          />
        ))}
      <YStack flex={1}>{children}</YStack>
    </YStack>
  )
}
