/// <reference types="react-native" />
import { styled, Input, TextArea, Label, GetProps } from 'tamagui'
import { neutralColors } from './colors'

/**
 * StyledInput - Tamagui Input with Digital Compass styling
 *
 * Pre-styled with proper dark theme colors:
 * - Deep Slate background
 * - Proper border and text colors
 * - Focus states with brand accent
 */
export const StyledInput = styled(Input, {
  name: 'StyledInput',
  backgroundColor: neutralColors.background.page,
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  color: neutralColors.text.primary,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeholderTextColor: neutralColors.text.secondary as any,
  borderRadius: 10,

  focusStyle: {
    borderColor: neutralColors.border.focus,
  },

  variants: {
    variant: {
      default: {},
      elevated: {
        backgroundColor: neutralColors.background.elevated,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

/**
 * StyledTextArea - Tamagui TextArea with Digital Compass styling
 */
export const StyledTextArea = styled(TextArea, {
  name: 'StyledTextArea',
  backgroundColor: neutralColors.background.page,
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  color: neutralColors.text.primary,
  // Same as StyledInput: without it the placeholder is white like real text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeholderTextColor: neutralColors.text.secondary as any,
  borderRadius: 10,

  focusStyle: {
    borderColor: neutralColors.border.focus,
  },

  variants: {
    variant: {
      default: {},
      elevated: {
        backgroundColor: neutralColors.background.elevated,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

/**
 * FormLabel - Label with Digital Compass styling
 *
 * Uppercase, secondary color, small text for form field labels
 */
export const FormLabelText = styled(Label, {
  name: 'FormLabelText',
  fontSize: 12,
  fontWeight: '600',
  color: '$color11',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
})

// Type exports
export type StyledInputProps = GetProps<typeof StyledInput>
export type StyledTextAreaProps = GetProps<typeof StyledTextArea>
export type FormLabelTextProps = GetProps<typeof FormLabelText>
