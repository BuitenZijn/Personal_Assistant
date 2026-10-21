import React from 'react'
import { YStack, XStack, Text, MicroLabel, neutralColors } from '@pa/ui'

interface BrandHeaderProps {
  /** One-line context under the lockup (e.g. "Create account") */
  subtitle?: string
  /** Smaller wordmark on dense screens that fight the keyboard */
  compact?: boolean
}

/**
 * BrandHeader - the auth screens' identity lockup: wordmark and tagline
 * (Personal Assistant has no logo yet). These screens are the first thing a new member sees.
 */
export function BrandHeader({ subtitle, compact = false }: BrandHeaderProps) {
  return (
    <YStack alignItems='center' gap='$4'>
      <YStack alignItems='center' gap='$2'>
        <Text weight='bold' size={compact ? '$8' : '$9'} textAlign='center'>
          Personal Assistant
        </Text>
        <MicroLabel variant='brand' letterSpacing={3}>
          Your household shopping
        </MicroLabel>
      </YStack>
      {subtitle ? (
        <Text size='$4' variant='muted' textAlign='center' maxWidth={320}>
          {subtitle}
        </Text>
      ) : null}
    </YStack>
  )
}

/** Hairline divider with a micro-label, e.g. "NEW HERE?" */
export function AuthDivider({ label }: { label: string }) {
  return (
    <XStack alignItems='center' gap='$3' paddingVertical='$2'>
      <YStack
        flex={1}
        height={1}
        backgroundColor={neutralColors.border.default}
      />
      <MicroLabel>{label}</MicroLabel>
      <YStack
        flex={1}
        height={1}
        backgroundColor={neutralColors.border.default}
      />
    </XStack>
  )
}
