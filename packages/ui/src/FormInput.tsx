import type { CSSProperties, InputHTMLAttributes } from 'react'
import { neutralColors, semanticColors } from './colors'

type FormInputSize = 'sm' | 'md' | 'lg'

export interface FormInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  /** Input size variant - renamed to avoid conflict with HTML size attribute */
  inputSize?: FormInputSize
  error?: boolean
}

const sizeStyles: Record<FormInputSize, CSSProperties> = {
  sm: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 13,
    borderRadius: 6,
  },
  md: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    borderRadius: 8,
  },
  lg: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 16,
    borderRadius: 10,
  },
}

/**
 * FormInput - A native HTML input component for web forms
 *
 * This uses a native HTML input element for proper form integration on web.
 * This ensures type="password", name, and other HTML attributes work correctly.
 * Uses Digital Compass design system colors.
 */
export function FormInput({
  inputSize = 'md',
  error = false,
  style,
  ...props
}: FormInputProps) {
  const baseStyle: CSSProperties = {
    width: '100%',
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: error
      ? semanticColors.error.border
      : neutralColors.border.default,
    backgroundColor: neutralColors.background.elevated,
    color: neutralColors.text.primary,
    fontFamily: 'var(--body)',
    outline: 'none',
    ...sizeStyles[inputSize],
    ...style,
  }

  return <input {...props} style={baseStyle} />
}
