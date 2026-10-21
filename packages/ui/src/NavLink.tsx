import { styled, GetProps, Paragraph } from 'tamagui'
import { brandColors, neutralColors } from './colors'

/**
 * NavLink - Styled text for navigation links
 * Updated to use Digital Compass design system colors.
 *
 * Variants:
 * - active: Whether the link is currently active/selected (Solar Amber)
 * - size: "$2" | "$3" | "$4" (use Tamagui size tokens)
 */
export const NavLink = styled(Paragraph, {
  name: 'NavLink',
  fontSize: 15,
  fontWeight: '500',
  color: neutralColors.text.secondary,
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  cursor: 'pointer',

  hoverStyle: {
    color: neutralColors.text.primary,
  },
  pressStyle: {
    opacity: 0.7,
  },

  variants: {
    active: {
      true: {
        fontWeight: '600',
        color: brandColors.primary,
      },
    },
    variant: {
      default: {},
      muted: {
        color: neutralColors.text.muted,
      },
    },
    size: {
      $2: {
        fontSize: 13,
        paddingHorizontal: '$2',
        paddingVertical: '$1',
      },
      $3: {
        fontSize: '$3',
        paddingHorizontal: '$3',
        paddingVertical: '$2',
      },
      $4: {
        fontSize: '$4',
        paddingHorizontal: '$4',
        paddingVertical: '$3',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: '$3',
  },
})

/**
 * DropdownItem - Styled text for dropdown menu items
 */
export const DropdownItem = styled(Paragraph, {
  name: 'DropdownItem',
  fontSize: 14,
  fontWeight: '500',
  color: neutralColors.text.primary,
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  cursor: 'pointer',

  hoverStyle: {
    backgroundColor: neutralColors.background.hover,
  },
  pressStyle: {
    opacity: 0.8,
  },

  variants: {
    active: {
      true: {
        fontWeight: '600',
        backgroundColor: neutralColors.background.hover,
      },
    },
    variant: {
      default: {},
      danger: {
        color: brandColors.destructive,
        hoverStyle: {
          backgroundColor: brandColors.destructiveLight,
        },
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

export type NavLinkProps = GetProps<typeof NavLink>
export type DropdownItemProps = GetProps<typeof DropdownItem>
