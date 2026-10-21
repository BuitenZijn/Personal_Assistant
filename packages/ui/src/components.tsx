import { styled, GetProps, YStack, Theme } from 'tamagui'
import { brandColors, cardColors } from './colors'

/**
 * Card - Primary container component for the Ella design system.
 *
 * This is the main card component. Use it for all card-like containers.
 *
 * Variants:
 * - `default`: Blue card; its contents use the `card` theme (white text)
 * - `outlined`: Blue card with a light border (also tells nested cards apart)
 * - `highlight`: Blue card with a white border for emphasis
 * - `muted`: Darker blue card
 * - `success`: Green-tinted for success states
 * - `ghost`: No background or border (container only)
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
const CardFrame = styled(YStack, {
  name: 'Card',
  borderRadius: 12,
  padding: '$4',
  backgroundColor: cardColors.background,
  borderWidth: 1,
  borderColor: cardColors.background,

  variants: {
    variant: {
      default: {
        backgroundColor: cardColors.background,
        borderColor: cardColors.background,
      },
      outlined: {
        backgroundColor: cardColors.background,
        borderColor: cardColors.border,
      },
      highlight: {
        backgroundColor: cardColors.background,
        borderWidth: 2,
        borderColor: cardColors.text,
      },
      muted: {
        backgroundColor: cardColors.hover,
        borderColor: cardColors.hover,
      },
      success: {
        backgroundColor: brandColors.secondaryLight,
        borderColor: brandColors.secondary,
      },
      ghost: {
        padding: 0,
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      subtle: {
        backgroundColor: cardColors.background,
        borderWidth: 0,
      },
    },
    size: {
      $3: {
        padding: '$3',
        borderRadius: 10,
      },
      $4: {
        padding: '$4',
        borderRadius: 12,
      },
      $5: {
        padding: '$5',
        borderRadius: 12,
      },
      $6: {
        padding: '$6',
        borderRadius: 12,
      },
    },
    interactive: {
      true: {
        cursor: 'pointer',
        hoverStyle: {
          backgroundColor: cardColors.hover,
          borderColor: cardColors.text,
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

/** Card variants drawn blue, whose contents use the `card` theme. */
const BLUE_CARD_VARIANTS: ReadonlySet<string> = new Set([
  'default',
  'outlined',
  'highlight',
  'muted',
  'subtle',
])

export const Card = CardFrame.styleable(function Card(props, ref) {
  const frame = <CardFrame ref={ref} {...props} />
  if (!BLUE_CARD_VARIANTS.has(props.variant ?? 'default')) return frame
  return <Theme name='card'>{frame}</Theme>
})

export type CardProps = GetProps<typeof Card>

// Re-export Tamagui components for convenience
export { Button } from 'tamagui'
