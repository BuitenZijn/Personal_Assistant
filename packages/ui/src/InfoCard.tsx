import { styled, GetProps, YStack, Paragraph, Theme } from 'tamagui'
import { semanticColors, cardColors } from './colors'

/**
 * InfoCard - A card for displaying contextual information or alerts
 *
 * Use this component for both informational cards and alert messages.
 * For simple inline alerts, use size="$3" for compact styling.
 *
 * Variants: default, success, error, warning, info
 *
 * @example
 * // Full info card with title
 * <InfoCard variant="success">
 *   <InfoCardTitle variant="success">Success!</InfoCardTitle>
 *   <InfoCardText variant="success">Your quest was saved.</InfoCardText>
 * </InfoCard>
 *
 * // Compact alert (replaces AlertCard)
 * <InfoCard variant="error" size="$3">
 *   <InfoCardText variant="error">Error message here</InfoCardText>
 * </InfoCard>
 */
const InfoCardFrame = styled(YStack, {
  name: 'InfoCard',
  padding: '$5',
  borderRadius: 12,
  borderWidth: 1,
  gap: '$3',

  variants: {
    variant: {
      default: {
        backgroundColor: cardColors.background,
        borderColor: cardColors.background,
      },
      success: {
        backgroundColor: semanticColors.success.surface,
        borderColor: semanticColors.success.border,
      },
      error: {
        backgroundColor: semanticColors.error.surface,
        borderColor: semanticColors.error.border,
      },
      warning: {
        backgroundColor: semanticColors.warning.surface,
        borderColor: semanticColors.warning.border,
      },
      info: {
        backgroundColor: semanticColors.info.surface,
        borderColor: semanticColors.info.border,
      },
    },
    size: {
      $3: {
        padding: '$3',
        gap: '$2',
        borderRadius: 10,
      },
      '$3.5': {
        padding: '$3.5',
        gap: '$2',
        borderRadius: 12,
      },
      $4: {
        padding: '$4',
        gap: '$2',
        borderRadius: 12,
      },
      $5: {
        padding: '$5',
        gap: '$3',
        borderRadius: 12,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: '$4',
  },
})

/**
 * The default InfoCard is a blue card; its contents use the `card` theme.
 * The status variants are light boxes, so they keep the light theme even
 * inside a blue card.
 */
export const InfoCard = InfoCardFrame.styleable(function InfoCard(props, ref) {
  const blue = (props.variant ?? 'default') === 'default'
  return (
    <Theme name={blue ? 'card' : 'light'}>
      <InfoCardFrame ref={ref} {...props} />
    </Theme>
  )
})

/**
 * InfoCardTitle - Title text for InfoCard with matching color
 */
export const InfoCardTitle = styled(Paragraph, {
  name: 'InfoCardTitle',
  fontSize: 18,
  fontWeight: '600',

  variants: {
    variant: {
      default: {
        color: '$color12',
      },
      success: {
        color: semanticColors.success.text,
      },
      error: {
        color: semanticColors.error.text,
      },
      warning: {
        color: semanticColors.warning.text,
      },
      info: {
        color: semanticColors.info.text,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

/**
 * InfoCardText - Body text for InfoCard with matching color
 */
export const InfoCardText = styled(Paragraph, {
  name: 'InfoCardText',
  fontSize: 14,
  lineHeight: 20,

  variants: {
    variant: {
      default: {
        color: '$color11',
      },
      success: {
        color: semanticColors.success.text,
      },
      error: {
        color: semanticColors.error.text,
      },
      warning: {
        color: semanticColors.warning.text,
      },
      info: {
        color: semanticColors.info.text,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

export type InfoCardProps = GetProps<typeof InfoCard>
export type InfoCardTitleProps = GetProps<typeof InfoCardTitle>
export type InfoCardTextProps = GetProps<typeof InfoCardText>
