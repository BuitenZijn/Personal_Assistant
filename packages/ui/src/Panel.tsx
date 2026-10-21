import { styled, YStack, GetProps } from 'tamagui'
import { Card } from './components'
import { neutralColors } from './colors'

/**
 * Panel - Extends Card for sidebars and elevated panels
 *
 * Panel is essentially Card with elevated styling and shadow support.
 * For most cases, you can use Card directly. Use Panel when you need
 * the elevated shadow effect or for sidebar-specific styling.
 */
export const Panel = styled(Card, {
  name: 'Panel',

  variants: {
    elevated: {
      true: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
    },
  } as const,
})

/**
 * SidebarPanel - A full-height panel for editor sidebars
 */
export const SidebarPanel = styled(Panel, {
  name: 'SidebarPanel',
  height: '100%',
  overflow: 'hidden',
})

/**
 * TableHeader - A styled header row for tables
 */
export const TableHeader = styled(YStack, {
  name: 'TableHeader',
  backgroundColor: neutralColors.background.hover,
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  borderBottomWidth: 1,
  borderBottomColor: neutralColors.border.default,
})

// Type exports
export type PanelProps = GetProps<typeof Panel>
export type SidebarPanelProps = GetProps<typeof SidebarPanel>
export type TableHeaderProps = GetProps<typeof TableHeader>
