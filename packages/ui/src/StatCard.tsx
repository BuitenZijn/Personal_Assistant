import { styled, GetProps, YStack, Paragraph } from 'tamagui'
import { brandColors, neutralColors } from './colors'

/**
 * StatCard - A card for displaying statistics with colored values
 * Updated to use Digital Compass design system colors.
 *
 * Variants:
 * - variant: primary (default), success, warning, error, info
 * - size: "$3" | "$4" | "$5" (use Tamagui size tokens)
 */
export const StatCard = styled(YStack, {
  name: 'StatCard',
  // Instrument: hairline tile on the page background, not a filled card
  backgroundColor: 'transparent',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  gap: '$2',

  variants: {
    variant: {
      primary: {},
      success: {},
      warning: {},
      error: {},
      info: {},
    },
    size: {
      $3: {
        padding: '$3',
      },
      $4: {
        padding: '$4',
      },
      $5: {
        padding: '$5',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: '$4',
  },
})

/**
 * StatLabel - Label text for a stat card
 */
export const StatLabel = styled(Paragraph, {
  name: 'StatLabel',
  fontFamily: 'IBMPlexMono_500Medium',
  fontSize: 11,
  lineHeight: 15,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  color: neutralColors.text.muted,
})

/**
 * StatValue - Value display for a stat card with color variants
 * Uses Digital Compass accent colors for visual distinction.
 *
 * Use variant="neutral" for plain uncolored numbers (replaces BigNumber).
 *
 * @example
 * // Colored stat value
 * <StatValue variant="primary">42</StatValue>
 *
 * // Plain number (BigNumber replacement)
 * <StatValue variant="neutral">42</StatValue>
 */
export const StatValue = styled(Paragraph, {
  name: 'StatValue',
  fontFamily: 'IBMPlexMono_600SemiBold',
  fontSize: 32,

  variants: {
    variant: {
      // Neutral variant replaces BigNumber - plain text color
      neutral: {
        color: neutralColors.text.primary,
      },
      primary: {
        color: brandColors.primary,
      },
      success: {
        color: brandColors.secondary,
      },
      warning: {
        color: brandColors.primary,
      },
      error: {
        color: brandColors.destructive,
      },
      info: {
        color: brandColors.secondary,
      },
    },
    size: {
      $7: {
        fontSize: 26,
        lineHeight: 32,
        fontFamily: 'IBMPlexMono_600SemiBold',
      },
      $9: {
        fontSize: 32,
        lineHeight: 38,
        fontFamily: 'IBMPlexMono_600SemiBold',
      },
      $10: {
        fontSize: 40,
        lineHeight: 46,
        fontFamily: 'IBMPlexMono_600SemiBold',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: '$9',
  },
})

export type StatCardProps = GetProps<typeof StatCard>
export type StatLabelProps = GetProps<typeof StatLabel>
export type StatValueProps = GetProps<typeof StatValue>
