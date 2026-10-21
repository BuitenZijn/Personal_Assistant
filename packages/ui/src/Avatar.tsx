import { styled, GetProps, YStack, Paragraph } from 'tamagui'
import { brandColors, neutralColors } from './colors'

/**
 * Avatar - A circular avatar component for displaying user initials or images
 * Updated to use Digital Compass design system colors.
 *
 * Variants:
 * - variant: primary (default - Solar Amber), success, warning, error, info, muted
 * - size: "$2" | "$3" | "$4" | "$5" | "$6" | "$8" (use Tamagui size tokens)
 */
export const Avatar = styled(YStack, {
  name: 'Avatar',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  overflow: 'hidden',

  variants: {
    variant: {
      primary: {
        backgroundColor: brandColors.primary,
      },
      success: {
        backgroundColor: brandColors.secondary,
      },
      warning: {
        backgroundColor: brandColors.primary,
      },
      error: {
        backgroundColor: brandColors.destructive,
      },
      info: {
        backgroundColor: brandColors.secondary,
      },
      muted: {
        backgroundColor: neutralColors.background.hover,
      },
    },
    size: {
      $2: {
        width: 24,
        height: 24,
      },
      $3: {
        width: 32,
        height: 32,
      },
      $4: {
        width: 40,
        height: 40,
      },
      $5: {
        width: 56,
        height: 56,
      },
      $6: {
        width: 80,
        height: 80,
      },
      $8: {
        width: 120,
        height: 120,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: '$4',
  },
})

/**
 * AvatarText - Text for displaying initials inside an Avatar
 */
export const AvatarText = styled(Paragraph, {
  name: 'AvatarText',
  fontWeight: '700',
  color: neutralColors.background.page,

  variants: {
    size: {
      $2: {
        fontSize: 12,
      },
      $3: {
        fontSize: 13,
      },
      $4: {
        fontSize: '$3',
      },
      $5: {
        fontSize: '$4',
      },
      $6: {
        fontSize: '$6',
      },
      $8: {
        fontSize: '$8',
      },
    },
  } as const,

  defaultVariants: {
    size: '$4',
  },
})

export type AvatarProps = GetProps<typeof Avatar>
export type AvatarTextProps = GetProps<typeof AvatarText>
