import React from 'react'
import { IconContainer, Text, YStack, neutralColors } from '@pa/ui'

export interface EmptyStateProps {
  /** Icon shown above the title. Size it to ~28-32px. */
  icon: React.ReactNode
  /** Short statement of what is missing. */
  title: string
  /** One line explaining what to do about it. */
  description?: string
  /** Optional call to action rendered below the text. */
  action?: React.ReactNode
  /** Icon container tone. `muted` on a busy screen, `default` otherwise. */
  variant?: 'default' | 'muted'
}

/**
 * The "there is nothing here yet" state for a list or screen.
 *
 * Every list screen had re-authored this same icon/title/description stack,
 * and one of them rendered a `<FlatList data={[]}>` purely to get at
 * `ListEmptyComponent` — a workaround for this component not existing.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <YStack
      flex={1}
      padding='$6'
      alignItems='center'
      justifyContent='center'
      gap='$4'
    >
      <IconContainer size='$6' variant={variant}>
        {icon}
      </IconContainer>
      <YStack alignItems='center' gap='$2'>
        <Text size='$5' weight='bold' textAlign='center'>
          {title}
        </Text>
        {description ? (
          <Text size='$3' variant='muted' textAlign='center' maxWidth={260}>
            {description}
          </Text>
        ) : null}
      </YStack>
      {action}
    </YStack>
  )
}

/** Re-exported so callers can tint an icon without a second import. */
export const emptyStateIconColor = neutralColors.text.muted
