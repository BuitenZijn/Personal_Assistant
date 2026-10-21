import { styled, XStack, GetProps } from 'tamagui'
import { neutralColors, brandColors, semanticColors } from './colors'

/**
 * MissionTag - A styled container for mission type indicators
 *
 * Used in waypoint lists and mission slots to show mission types
 * with proper Digital Compass styling.
 */
export const MissionTag = styled(XStack, {
  name: 'MissionTag',
  gap: '$1',
  alignItems: 'center',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',
  backgroundColor: neutralColors.background.page,

  variants: {
    variant: {
      default: {
        backgroundColor: neutralColors.background.page,
      },
      travel: {
        backgroundColor: brandColors.secondaryLight,
      },
      checkpoint: {
        backgroundColor: brandColors.primaryLight,
      },
      active: {
        backgroundColor: brandColors.secondary,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

/**
 * IconContainer - A styled container for icons with background
 *
 * Common pattern for icon backgrounds in cards and lists.
 */
export const IconContainer = styled(XStack, {
  name: 'IconContainer',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,

  variants: {
    size: {
      $3: {
        width: 32,
        height: 32,
        padding: '$1',
      },
      $4: {
        width: 40,
        height: 40,
        padding: '$2',
      },
      $5: {
        width: 48,
        height: 48,
        padding: '$2',
      },
      $6: {
        width: 56,
        height: 56,
        padding: '$3',
      },
      $8: {
        width: 72,
        height: 72,
        padding: '$3',
      },
      $10: {
        width: 96,
        height: 96,
        padding: '$4',
        borderRadius: 12,
      },
    },
    // Instrument: hairline tiles, not tinted fills — the tile is a 1px frame
    // on the page background and the color lives on the border + glyph.
    // 'primary-solid' stays a true amber fill (callers must use dark ink).
    variant: {
      default: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: neutralColors.border.default,
      },
      active: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: brandColors.secondary,
      },
      primary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: brandColors.primary,
      },
      'primary-solid': {
        backgroundColor: brandColors.primary,
      },
      muted: {
        backgroundColor: neutralColors.background.page,
      },
      success: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: semanticColors.success.border,
      },
    },
  } as const,

  defaultVariants: {
    size: '$4',
    variant: 'default',
  },
})

// Type exports
export type MissionTagProps = GetProps<typeof MissionTag>
export type IconContainerProps = GetProps<typeof IconContainer>
