import { styled, GetProps, Card as TamaguiCard, Paragraph } from 'tamagui'
import {
  semanticColors,
  neutralColors,
  roleColors,
  statusColors,
  brandColors,
} from './colors'

/**
 * Badge - A small label/tag component for displaying status, categories, etc.
 * Updated to use Digital Compass design system colors.
 */
export const Badge = styled(TamaguiCard, {
  name: 'Badge',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',
  alignSelf: 'flex-start',

  variants: {
    variant: {
      default: {
        backgroundColor: neutralColors.background.hover,
      },
      success: {
        backgroundColor: statusColors.active.background,
      },
      warning: {
        backgroundColor: statusColors.draft.background,
      },
      danger: {
        backgroundColor: semanticColors.error.background,
      },
      info: {
        backgroundColor: semanticColors.info.background,
      },
      purple: {
        backgroundColor: roleColors.admin.background,
      },
      debug: {
        backgroundColor: roleColors.debug.background,
      },
      // New Digital Compass variants
      active: {
        backgroundColor: statusColors.active.background,
      },
      draft: {
        backgroundColor: statusColors.draft.background,
      },
      archived: {
        backgroundColor: statusColors.archived.background,
      },
      // Solid variants for more prominent display
      primary: {
        backgroundColor: brandColors.primary,
      },
      secondary: {
        backgroundColor: brandColors.secondary,
      },
    },
    size: {
      $2: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
        borderRadius: '$2',
      },
      $3: {
        paddingHorizontal: '$2.5',
        paddingVertical: '$1.5',
        borderRadius: '$3',
      },
      $4: {
        paddingHorizontal: '$3',
        paddingVertical: '$2',
        borderRadius: '$3',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: '$2',
  },
})

export const BadgeText = styled(Paragraph, {
  name: 'BadgeText',
  fontWeight: '600',

  variants: {
    variant: {
      default: {
        color: neutralColors.text.secondary,
      },
      success: {
        color: statusColors.active.text,
      },
      warning: {
        color: statusColors.draft.text,
      },
      danger: {
        color: semanticColors.error.text,
      },
      info: {
        color: semanticColors.info.text,
      },
      purple: {
        color: roleColors.admin.text,
      },
      debug: {
        color: roleColors.debug.text,
      },
      // New Digital Compass variants
      active: {
        color: statusColors.active.text,
      },
      draft: {
        color: statusColors.draft.text,
      },
      archived: {
        color: statusColors.archived.text,
      },
      // Solid variants - use inverse text (dark on light background)
      primary: {
        color: neutralColors.text.inverse,
      },
      secondary: {
        color: neutralColors.text.inverse,
      },
    },
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
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: '$2',
  },
})

export type BadgeProps = GetProps<typeof Badge>
export type BadgeTextProps = GetProps<typeof BadgeText>
