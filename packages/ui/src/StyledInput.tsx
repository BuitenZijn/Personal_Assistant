/// <reference types="react-native" />
import { styled, Input, TextArea, Label, GetProps } from 'tamagui'
import { neutralColors } from './colors'

/**
 * StyledInput - Tamagui Input in the house style: a white field with a
 * neutral border that turns teal on focus.
 */
export const StyledInput = styled(Input, {
  name: 'StyledInput',
  backgroundColor: neutralColors.background.elevated,
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  color: neutralColors.text.primary,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeholderTextColor: neutralColors.text.placeholder as any,
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
 * StyledTextArea - Tamagui TextArea in the house style
 */
export const StyledTextArea = styled(TextArea, {
  name: 'StyledTextArea',
  backgroundColor: neutralColors.background.elevated,
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  color: neutralColors.text.primary,
  // Same as StyledInput: without it the placeholder is white like real text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeholderTextColor: neutralColors.text.placeholder as any,
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
 * FormLabel - Label in the house style
 *
 * Sentence case, medium weight, muted: the label above a form field
 */
export const FormLabelText = styled(Label, {
  name: 'FormLabelText',
  fontSize: 13,
  fontWeight: '500',
  color: '$color11',
})

// Type exports
export type StyledInputProps = GetProps<typeof StyledInput>
export type StyledTextAreaProps = GetProps<typeof StyledTextArea>
export type FormLabelTextProps = GetProps<typeof FormLabelText>
