import { createContext } from 'react'
import { styled, GetProps, Button as TamaguiButton } from 'tamagui'
import { brandColors, semanticColors } from './colors'

/** Variants with a solid fill and a white label. */
const FILLED_VARIANTS: ReadonlySet<string> = new Set([
  'primary',
  'danger',
  'success',
  'warning',
])

/** Filled variants in the brand color (teal). */
const BRAND_VARIANTS: ReadonlySet<string> = new Set(['primary', 'warning'])

/**
 * Set inside a filled Button: 'brand' for the brand fill (its label follows
 * the theme's `onBrand`), 'status' for the danger and success fills (white
 * label). ButtonText reads it.
 */
export type ButtonFill = 'brand' | 'status' | false
export const ButtonFillContext = createContext<ButtonFill>(false)

const ButtonFrame = styled(TamaguiButton, {
  name: 'Button',
  backgroundColor: '$brand',
  borderRadius: 10,
  height: 48,
  pressStyle: {
    opacity: 0.9,
    scale: 0.98,
  },
  hoverStyle: {
    backgroundColor: '$brandHover',
  },
  disabledStyle: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },

  variants: {
    size: {
      $2: {
        height: 28,
        paddingHorizontal: '$2',
        borderRadius: 8,
      },
      $3: {
        height: 36,
        paddingHorizontal: '$3',
        borderRadius: 8,
      },
      $4: {
        height: 44,
        paddingHorizontal: '$4',
        borderRadius: 10,
      },
      $5: {
        height: 52,
        paddingHorizontal: '$5',
        borderRadius: 10,
      },
    },
    variant: {
      primary: {
        backgroundColor: '$brand',
        hoverStyle: { backgroundColor: '$brandHover' },
        pressStyle: { opacity: 0.9, scale: 0.98 },
      },
      /** Tinted teal fill with a dark teal label: the second action */
      secondary: {
        backgroundColor: brandColors.primaryLight,
        hoverStyle: { backgroundColor: brandColors.primaryLight, opacity: 0.9 },
        pressStyle: { opacity: 0.9, scale: 0.98 },
      },
      danger: {
        backgroundColor: brandColors.destructive,
        hoverStyle: { backgroundColor: brandColors.destructiveHover },
        pressStyle: { opacity: 0.9, scale: 0.98 },
      },
      success: {
        backgroundColor: semanticColors.success.main,
        hoverStyle: { backgroundColor: semanticColors.success.hover },
        pressStyle: { opacity: 0.9, scale: 0.98 },
      },
      warning: {
        backgroundColor: '$brand',
        hoverStyle: { backgroundColor: '$brandHover' },
        pressStyle: { opacity: 0.9, scale: 0.98 },
      },
      ghost: {
        backgroundColor: '$backgroundHover',
        hoverStyle: { backgroundColor: '$backgroundStrong' },
        pressStyle: { opacity: 0.9, scale: 0.98 },
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$brand',
        hoverStyle: { backgroundColor: brandColors.primaryLight },
        pressStyle: { opacity: 0.9, scale: 0.98 },
      },
      'outline-danger': {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: brandColors.destructive,
        hoverStyle: { backgroundColor: brandColors.destructiveLight },
        pressStyle: { opacity: 0.9, scale: 0.98 },
      },
      'ghost-row': {
        backgroundColor: 'transparent',
        borderWidth: 0,
        hoverStyle: { backgroundColor: '$backgroundHover' },
        pressStyle: {
          backgroundColor: '$backgroundHover',
          opacity: 0.9,
          scale: 0.99,
        },
      },
    },
  } as const,

  defaultVariants: {
    size: '$4',
    variant: 'primary',
  },
})

/**
 * Button - Main action button
 *
 * Variants: primary, secondary, danger, success, warning, ghost, outline, outline-danger
 * Sizes: $3, $4, $5
 *
 * A ButtonText inside a filled variant (primary, danger, success, warning)
 * takes that fill's label color automatically, unless the button overrides
 * its background or the text sets its own color. Pair `secondary` with
 * `<ButtonText variant='secondary'>`.
 */
export const Button = ButtonFrame.styleable(function Button(props, ref) {
  const variant = props.variant ?? 'primary'
  const filled: ButtonFill =
    FILLED_VARIANTS.has(variant) &&
    props.backgroundColor === undefined &&
    (BRAND_VARIANTS.has(variant) ? 'brand' : 'status')
  return (
    <ButtonFillContext.Provider value={filled}>
      <ButtonFrame ref={ref} {...props} />
    </ButtonFillContext.Provider>
  )
})

/**
 * IconButton - A small button typically used for actions in cards/lists
 */
export const IconButton = styled(TamaguiButton, {
  name: 'IconButton',
  size: '$3',
  borderRadius: '$3',
  backgroundColor: '$backgroundHover',
  hoverStyle: {
    backgroundColor: '$backgroundStrong',
  },
  pressStyle: {
    backgroundColor: '$backgroundStrong',
    opacity: 0.8,
  },

  variants: {
    variant: {
      ghost: {
        backgroundColor: '$backgroundHover',
        hoverStyle: { backgroundColor: '$backgroundStrong' },
        pressStyle: {
          backgroundColor: '$backgroundStrong',
          opacity: 0.8,
        },
      },
      danger: {
        backgroundColor: brandColors.destructiveLight,
        hoverStyle: { backgroundColor: brandColors.destructive },
        pressStyle: { backgroundColor: brandColors.destructive, opacity: 0.8 },
      },
      success: {
        backgroundColor: brandColors.secondaryLight,
        hoverStyle: { backgroundColor: brandColors.secondary },
        pressStyle: { backgroundColor: brandColors.secondary, opacity: 0.8 },
      },
    },
  } as const,

  defaultVariants: {
    variant: 'ghost',
  },
})

export type ButtonProps = GetProps<typeof Button>
export type IconButtonProps = GetProps<typeof IconButton>
