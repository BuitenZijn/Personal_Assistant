import { styled, GetProps, H1, H2, H3, Paragraph } from 'tamagui'

/**
 * PageTitle - Main page heading
 * Uses Digital Compass design system colors.
 */
export const PageTitle = styled(H1, {
  name: 'PageTitle',
  fontSize: 42,
  fontWeight: '700',
  color: '$color12',
})

/**
 * SectionTitle - Section heading within a page
 * Uses Digital Compass design system colors.
 */
export const SectionTitle = styled(H2, {
  name: 'SectionTitle',
  fontSize: 24,
  fontWeight: '600',
  color: '$color12',
})

/**
 * CardTitle - Smaller heading for cards
 * Uses Digital Compass design system colors.
 */
export const CardTitle = styled(H3, {
  name: 'CardTitle',
  fontSize: 18,
  fontWeight: '700',
  color: '$color12',
})

/**
 * BodyText - Regular body text
 * Uses Digital Compass design system colors.
 */
export const BodyText = styled(Paragraph, {
  name: 'BodyText',
  fontSize: 15,
  lineHeight: 22,
  color: '$color12',

  variants: {
    muted: {
      true: {
        color: '$color11',
      },
    },
    size: {
      $2: {
        fontSize: 13,
        lineHeight: 18,
      },
      $3: {
        fontSize: '$3',
        lineHeight: 22,
      },
      $4: {
        fontSize: '$4',
        lineHeight: 24,
      },
    },
  } as const,

  defaultVariants: {
    size: '$3',
  },
})

/**
 * Caption - Small text for metadata, timestamps, etc.
 * Uses Digital Compass design system colors.
 */
export const Caption = styled(Paragraph, {
  name: 'Caption',
  fontSize: 12,
  color: '$color1',

  variants: {
    size: {
      $1: {
        fontSize: 12,
      },
      $2: {
        fontSize: 13,
      },
      $3: {
        fontSize: '$3',
      },
    },
  } as const,

  defaultVariants: {
    size: '$2',
  },
})

/**
 * ValueText - Text for displaying values
 * Uses Digital Compass design system colors.
 */
export const ValueText = styled(Paragraph, {
  name: 'ValueText',
  fontSize: 14,
  fontWeight: '600',
  color: '$color12',
})

/**
 * IconText - Text sized for emoji/icon display
 */
export const IconText = styled(Paragraph, {
  name: 'IconText',
  fontSize: 48,
  lineHeight: 52,

  variants: {
    size: {
      sm: {
        fontSize: 24,
        lineHeight: 28,
      },
      md: {
        fontSize: 36,
        lineHeight: 40,
      },
      lg: {
        fontSize: 48,
        lineHeight: 52,
      },
      xl: {
        fontSize: 56,
        lineHeight: 60,
      },
    },
  } as const,

  defaultVariants: {
    size: 'lg',
  },
})

export type PageTitleProps = GetProps<typeof PageTitle>
export type SectionTitleProps = GetProps<typeof SectionTitle>
export type CardTitleProps = GetProps<typeof CardTitle>
export type BodyTextProps = GetProps<typeof BodyText>
export type CaptionProps = GetProps<typeof Caption>
export type ValueTextProps = GetProps<typeof ValueText>
export type IconTextProps = GetProps<typeof IconText>
