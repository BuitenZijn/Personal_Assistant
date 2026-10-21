import { styled, GetProps, YStack, Paragraph } from 'tamagui'
import { brandColors, neutralColors } from './colors'
import { fontFaces } from './fonts'

/**
 * StatCard - A card for displaying statistics with colored values
 * Uses the house-style colors.
 *
 * Variants:
 * - variant: primary (default), success, warning, error, info
 * - size: "$3" | "$4" | "$5" (use Tamagui size tokens)
 */
export const StatCard = styled(YStack, {
  name: 'StatCard',
  // Hairline tile on the page background, not a filled card
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
  fontFamily: fontFaces.medium,
  fontSize: 13,
  lineHeight: 18,
  color: neutralColors.text.muted,
})

/**
 * StatValue - Value display for a stat card with color variants
 * Uses the semantic colors for visual distinction.
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
  fontFamily: fontFaces.semibold,
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
        fontFamily: fontFaces.semibold,
      },
      $9: {
        fontSize: 32,
        lineHeight: 38,
        fontFamily: fontFaces.semibold,
      },
      $10: {
        fontSize: 40,
        lineHeight: 46,
        fontFamily: fontFaces.semibold,
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
