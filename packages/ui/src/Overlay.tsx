import { styled, Sheet, GetProps, YStack } from 'tamagui'
import { neutralColors } from './colors'

/**
 * Overlay Components - Styled modal, sheet, and popup containers
 * Uses Digital Compass design system colors for consistent dark theme overlays.
 */

/**
 * SheetFrame - Pre-styled Sheet.Frame for bottom sheets
 * Use with Sheet component for consistent styling.
 */
export const SheetFrame = styled(Sheet.Frame, {
  name: 'SheetFrame',
  backgroundColor: neutralColors.background.elevated,
  padding: '$4',
  borderTopLeftRadius: '$4',
  borderTopRightRadius: '$4',
})

/**
 * SheetHandle - Pre-styled Sheet.Handle for bottom sheets
 * Use with Sheet component for consistent styling.
 */
export const SheetHandle = styled(Sheet.Handle, {
  name: 'SheetHandle',
  backgroundColor: neutralColors.border.default,
})

/**
 * DialogContentFrame - Pre-styled container for Dialog content
 * Apply to Dialog.Content for consistent styling.
 */
export const DialogContentFrame = styled(YStack, {
  name: 'DialogContentFrame',
  backgroundColor: neutralColors.background.elevated,
  padding: '$6',
  gap: '$4',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: neutralColors.border.default,

  // Shadow for elevation
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 24,

  variants: {
    size: {
      $3: {
        maxWidth: 360,
        padding: '$4',
      },
      $4: {
        maxWidth: 480,
        padding: '$5',
      },
      $5: {
        maxWidth: 640,
        padding: '$6',
      },
      $6: {
        maxWidth: 800,
        padding: '$6',
      },
    },
  } as const,

  defaultVariants: {
    size: '$4',
  },
})

/**
 * PopupContainer - General-purpose elevated popup container
 * Use for dropdowns, popovers, tooltips, menus, etc.
 *
 * Use variant="menu" for dropdown menus (no padding, overflow hidden).
 *
 * @example
 * // Tooltip/popover
 * <PopupContainer>
 *   <Text>Tooltip content</Text>
 * </PopupContainer>
 *
 * // Dropdown menu (replaces MenuContainer)
 * <PopupContainer variant="menu">
 *   <DropdownItem>Item 1</DropdownItem>
 *   <DropdownItem>Item 2</DropdownItem>
 * </PopupContainer>
 */
export const PopupContainer = styled(YStack, {
  name: 'PopupContainer',
  backgroundColor: neutralColors.background.elevated,
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  padding: '$3',

  // Shadow for elevation
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 12,

  variants: {
    variant: {
      default: {},
      // Menu variant - replaces MenuContainer
      menu: {
        padding: 0,
        overflow: 'hidden',
      },
    },
    elevated: {
      true: {
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

// Alias for backwards compatibility - use PopupContainer variant="menu" instead
export const MenuContainer = PopupContainer

export type SheetFrameProps = GetProps<typeof SheetFrame>
export type SheetHandleProps = GetProps<typeof SheetHandle>
export type DialogContentFrameProps = GetProps<typeof DialogContentFrame>
export type PopupContainerProps = GetProps<typeof PopupContainer>
export type MenuContainerProps = PopupContainerProps
