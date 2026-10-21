import { useContext } from 'react'
import { styled, Paragraph, GetProps } from 'tamagui'
import { ButtonFillContext } from './Buttons'
import { neutralColors, brandColors, semanticColors } from './colors'
import { fontFaces } from './fonts'

/**
 * Text - Base text component with semantic variants
 *
 * Use this instead of raw Paragraph for consistent styling across the app.
 *
 * Variants:
 * - variant: "default" | "muted" | "subtle" | "inverse" | "light" | "lightMuted" | "error" | "success" | "warning" | "info" | "brand"
 * - size: "$1" | "$2" | "$3" | "$4" | "$5" | "$6" | "$7" (use Tamagui size tokens)
 * - weight: "normal" | "medium" | "semibold" | "bold"
 *
 * Light variants (for colored backgrounds like overlays):
 * - "light": Pure white text for high contrast on colored backgrounds
 * - "lightMuted": Semi-transparent white (80% opacity) for secondary text on colored backgrounds
 */
export const Text = styled(Paragraph, {
  name: 'Text',
  color: '$color12',
  fontSize: '$3',

  variants: {
    variant: {
      default: {
        color: '$color12',
      },
      muted: {
        color: '$color11',
      },
      subtle: {
        color: '$color1',
      },
      inverse: {
        color: neutralColors.background.page,
      },
      /** Pure white - for text on colored/primary backgrounds */
      light: {
        color: '#FFFFFF',
      },
      /** Semi-transparent white - for secondary text on colored backgrounds */
      lightMuted: {
        color: 'rgba(255, 255, 255, 0.8)',
      },
      error: {
        color: semanticColors.error.text,
      },
      success: {
        color: semanticColors.success.text,
      },
      warning: {
        color: semanticColors.warning.text,
      },
      info: {
        color: semanticColors.info.text,
      },
      brand: {
        color: brandColors.primaryText,
      },
    },
    size: {
      $1: {
        fontSize: 12,
        lineHeight: 14,
      },
      $2: {
        fontSize: 13,
        lineHeight: 16,
      },
      $3: {
        fontSize: '$3',
        lineHeight: 20,
      },
      $4: {
        fontSize: '$4',
        lineHeight: 24,
      },
      $5: {
        fontSize: '$5',
        lineHeight: 28,
      },
      $6: {
        fontSize: '$6',
        lineHeight: 32,
      },
      $7: {
        fontSize: '$7',
        lineHeight: 36,
      },
      $8: {
        fontSize: '$8',
        lineHeight: 40,
      },
      $9: {
        fontSize: '$9',
        lineHeight: 60,
      },
      $10: {
        fontSize: '$10',
        lineHeight: 72,
      },
    },
    weight: {
      normal: {
        fontWeight: '400',
      },
      medium: {
        fontWeight: '500',
      },
      semibold: {
        fontWeight: '600',
      },
      bold: {
        fontWeight: '700',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: '$3',
    weight: 'normal',
  },
})

export type TextProps = GetProps<typeof Text>

const ButtonTextFrame = styled(Paragraph, {
  name: 'ButtonText',
  color: '$color12',
  fontWeight: '600',
  fontSize: '$3',
  textAlign: 'center',

  variants: {
    size: {
      $2: {
        fontSize: 13,
      },
      $3: {
        fontSize: '$3',
      },
      $4: {
        fontSize: '$4',
      },
    },
    variant: {
      primary: {
        color: '$color12',
      },
      /** On the tinted secondary button: dark teal */
      secondary: {
        color: brandColors.primaryText,
      },
      danger: {
        color: '$color12',
      },
      success: {
        color: '$color12',
      },
      ghost: {
        color: '$color12',
      },
      // Variants from ButtonText
      default: {
        color: '$color12',
      },
      inverse: {
        color: '#FFFFFF',
      },
      muted: {
        color: '$color11',
      },
      /**
       * cta - the main call to action: sentence case, semibold, a size up,
       * in the fill's label color. Opt-in per button.
       */
      cta: {
        color: '$onBrand',
        fontWeight: '600',
        fontSize: 17,
      },
    },
    /** Label on a filled Button; set by the parent Button. */
    onFill: {
      brand: {
        color: '$onBrand',
      },
      status: {
        color: neutralColors.text.onFill,
      },
    },
  } as const,

  defaultVariants: {
    size: '$3',
    variant: 'primary',
  },
})

/**
 * ButtonText - label inside a Button. Inside a filled Button (primary,
 * danger, success, warning) it uses the label color of that fill whatever its
 * variant: white, or blue on a card's white brand button. Pass `color` to
 * opt out.
 */
export const ButtonText = ButtonTextFrame.styleable(
  function ButtonText(props, ref) {
    const fill = useContext(ButtonFillContext)
    const onFill = props.color === undefined && fill ? fill : props.onFill
    return <ButtonTextFrame ref={ref} {...props} onFill={onFill} />
  },
)

export const AlertText = styled(Paragraph, {
  name: 'AlertText',
  fontSize: 13,
  lineHeight: 18,

  variants: {
    variant: {
      error: {
        color: semanticColors.error.text,
      },
      success: {
        color: semanticColors.success.text,
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
    variant: 'error',
  },
})

export const LinkText = styled(Paragraph, {
  name: 'LinkText',
  fontSize: 14,
  fontWeight: '600',
  color: brandColors.primaryText,
  cursor: 'pointer',
  hoverStyle: {
    color: brandColors.primaryHover,
  },
})

/**
 * MonoText - numbers that line up: prices, quantities, totals. Inter with
 * tabular figures (the house style has no monospace face). Weight variants
 * switch the font face — RN doesn't synthesize weights for custom fonts.
 */
export const MonoText = styled(Paragraph, {
  name: 'MonoText',
  fontFamily: fontFaces.medium,
  fontVariant: ['tabular-nums'],
  color: '$color12',
  fontSize: 15,

  variants: {
    variant: {
      default: { color: '$color12' },
      muted: { color: '$color11' },
      subtle: { color: '$color1' },
      brand: { color: brandColors.primaryText },
      success: { color: semanticColors.success.text },
    },
    size: {
      $1: { fontSize: 11, lineHeight: 14 },
      $2: { fontSize: 13, lineHeight: 17 },
      $3: { fontSize: 15, lineHeight: 20 },
      $4: { fontSize: 17, lineHeight: 22 },
      $5: { fontSize: 22, lineHeight: 27 },
      $6: { fontSize: 28, lineHeight: 33 },
      $7: { fontSize: 40, lineHeight: 46 },
    },
    weight: {
      normal: { fontFamily: fontFaces.regular },
      medium: { fontFamily: fontFaces.medium },
      semibold: { fontFamily: fontFaces.semibold },
      bold: { fontFamily: fontFaces.bold },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: '$3',
    weight: 'medium',
  },
})

/**
 * MicroLabel - small section and field labels ("Email address", "Profile").
 * Sentence case, medium weight, muted: the house style never shouts.
 */
export const MicroLabel = styled(Paragraph, {
  name: 'MicroLabel',
  fontFamily: fontFaces.medium,
  fontSize: 13,
  lineHeight: 18,
  color: '$color11',

  variants: {
    variant: {
      default: { color: '$color11' },
      secondary: { color: '$color7' },
      brand: { color: brandColors.primaryText },
      success: { color: semanticColors.success.text },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

export type MonoTextProps = GetProps<typeof MonoText>
export type MicroLabelProps = GetProps<typeof MicroLabel>
export type ButtonTextProps = GetProps<typeof ButtonText>
export type AlertTextProps = GetProps<typeof AlertText>
export type LinkTextProps = GetProps<typeof LinkText>
