import { styled, GetProps, YStack, Spinner as TamaguiSpinner } from 'tamagui'
import { brandColors, neutralColors } from './colors'

/**
 * CenteredContainer - A flex container that centers its content
 */
export const CenteredContainer = styled(YStack, {
  name: 'CenteredContainer',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$6',
  gap: '$4',
})

/**
 * PageContainer - Main page content container
 * Uses Digital Compass Deep Slate background
 */
export const PageContainer = styled(YStack, {
  name: 'PageContainer',
  flex: 1,
  padding: '$6',
  gap: '$6',
  backgroundColor: neutralColors.background.page,
})

/**
 * SectionContainer - Container for page sections
 */
export const SectionContainer = styled(YStack, {
  name: 'SectionContainer',
  gap: '$4',
})

/**
 * LoadingSpinner - Styled spinner for loading states
 * Uses Solar Amber accent color
 */
export const LoadingSpinner = styled(TamaguiSpinner, {
  name: 'LoadingSpinner',
  color: brandColors.primary,

  variants: {
    size: {
      $3: {
        width: 20,
        height: 20,
      },
      $4: {
        width: 32,
        height: 32,
      },
      $5: {
        width: 48,
        height: 48,
      },
    },
  } as const,

  defaultVariants: {
    size: '$4',
  },
})

export type CenteredContainerProps = GetProps<typeof CenteredContainer>
export type PageContainerProps = GetProps<typeof PageContainer>
export type SectionContainerProps = GetProps<typeof SectionContainer>
export type LoadingSpinnerProps = GetProps<typeof LoadingSpinner>
