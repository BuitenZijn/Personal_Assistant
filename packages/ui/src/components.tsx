import { styled, GetProps, YStack, Theme } from 'tamagui'
import { cardColors, neutralColors, semanticColors } from './colors'

/**
 * Card - Primary container component of the house style.
 *
 * This is the main card component. Use it for all card-like containers.
 *
 * Variants:
 * - `default`: White card with the soft navy shadow
 * - `outlined`: White card with a hairline instead of a shadow (nested cards)
 * - `highlight`: White card with a teal border (the selected option)
 * - `muted`: Grey-blue card, flat (secondary information)
 * - `success`: Green-tinted for success states
 * - `ghost`: No background or border (container only)
 * - `subtle`: White card, flat
 *
 * Size: "$3" | "$4" | "$5" | "$6" (use Tamagui size tokens)
 *
 * Interactive: Set `interactive` to true for clickable cards with hover/press effects
 *
 * @example
 * // Basic card
 * <Card>Content</Card>
 *
 * // Interactive card with size
 * <Card interactive size="$5">Clickable content</Card>
 *
 * // Highlighted card
 * <Card variant="highlight">Important content</Card>
 */
/** 0 3px 8px of navy at 10%: the one shadow of the house style. */
const cardShadow = {
  shadowColor: cardColors.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 8,
  elevation: 2,
} as const

const flat = {
  shadowOpacity: 0,
  elevation: 0,
} as const

const CardFrame = styled(YStack, {
  name: 'Card',
  borderRadius: 10,
  padding: '$4',
  backgroundColor: cardColors.background,
  borderWidth: 1,
  borderColor: cardColors.background,
  ...cardShadow,

  variants: {
    variant: {
      default: {
        backgroundColor: cardColors.background,
        borderColor: cardColors.background,
      },
      outlined: {
        backgroundColor: cardColors.background,
        borderColor: cardColors.border,
        ...flat,
      },
      highlight: {
        backgroundColor: cardColors.background,
        borderWidth: 2,
        borderColor: neutralColors.border.focus,
      },
      muted: {
        backgroundColor: neutralColors.background.page,
        borderColor: neutralColors.background.page,
        ...flat,
      },
      success: {
        backgroundColor: semanticColors.success.surface,
        borderColor: semanticColors.success.border,
        ...flat,
      },
      ghost: {
        padding: 0,
        backgroundColor: 'transparent',
        borderWidth: 0,
        ...flat,
      },
      subtle: {
        backgroundColor: cardColors.background,
        borderWidth: 0,
        ...flat,
      },
    },
    size: {
      $3: {
        padding: '$3',
        borderRadius: 10,
      },
      $4: {
        padding: '$4',
        borderRadius: 10,
      },
      $5: {
        padding: '$5',
        borderRadius: 10,
      },
      $6: {
        padding: '$6',
        borderRadius: 10,
      },
    },
    interactive: {
      true: {
        cursor: 'pointer',
        hoverStyle: {
          backgroundColor: cardColors.hover,
        },
        pressStyle: {
          scale: 0.99,
          opacity: 0.95,
        },
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: '$4',
  },
})

/** Card variants drawn white, whose contents use the `card` theme. */
const WHITE_CARD_VARIANTS: ReadonlySet<string> = new Set([
  'default',
  'outlined',
  'highlight',
  'subtle',
])

export const Card = CardFrame.styleable(function Card(props, ref) {
  const frame = <CardFrame ref={ref} {...props} />
  if (!WHITE_CARD_VARIANTS.has(props.variant ?? 'default')) return frame
  return <Theme name='card'>{frame}</Theme>
})

export type CardProps = GetProps<typeof Card>

// Re-export Tamagui components for convenience
export { Button } from 'tamagui'
