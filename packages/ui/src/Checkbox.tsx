import { styled, XStack, Text } from 'tamagui'
import { Checkbox as TamaguiCheckbox } from 'tamagui'
import { neutralColors, brandColors } from './colors'
import { Check, Minus } from 'lucide-react'

/**
 * Checkbox - A styled checkbox component for selection
 *
 * Features:
 * - Controlled checked state
 * - Indeterminate state for "select all" scenarios
 * - Consistent styling with the design system
 *
 * @example
 * // Basic checkbox
 * <Checkbox checked={isChecked} onCheckedChange={setIsChecked} />
 *
 * // Checkbox with label
 * <Checkbox
 *   checked={isChecked}
 *   onCheckedChange={setIsChecked}
 *   label="Select this item"
 * />
 *
 * // Indeterminate (partial selection)
 * <Checkbox checked="indeterminate" onCheckedChange={handleChange} />
 */

export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean | 'indeterminate'
  /** Callback when checked state changes */
  onCheckedChange?: (checked: boolean) => void
  /** Whether the checkbox is disabled */
  disabled?: boolean
  /** Optional label text */
  label?: string
  /** Size of the checkbox */
  size?: 'sm' | 'md' | 'lg'
  /** ID for form accessibility */
  id?: string
  /**
   * Accessible name when there is no visible `label` (e.g. "Select row").
   * Defaults to `label`.
   */
  'aria-label'?: string
}

const sizeMap = {
  sm: '$3',
  md: '$4',
  lg: '$5',
} as const

const iconSizeMap = {
  sm: 12,
  md: 14,
  lg: 16,
} as const

/**
 * CheckboxContainer - Wrapper for checkbox with optional label
 */
const CheckboxContainer = styled(XStack, {
  name: 'CheckboxContainer',
  alignItems: 'center',
  gap: '$2',
  cursor: 'pointer',

  variants: {
    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
    },
  } as const,
})

/**
 * CheckboxLabel - Label text for checkbox
 */
const CheckboxLabel = styled(XStack, {
  name: 'CheckboxLabel',
  cursor: 'pointer',
})

export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  size = 'md',
  id,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  const isIndeterminate = checked === 'indeterminate'
  const isChecked = checked === true
  const iconSize = iconSizeMap[size]

  const toggle = () => {
    if (disabled) return
    // Indeterminate and unchecked both become checked; checked unchecks
    onCheckedChange?.(!isChecked)
  }

  const handleLabelPress = (e: { stopPropagation?: () => void }) => {
    // Stop propagation to prevent triggering parent handlers (e.g., row click)
    e?.stopPropagation?.()
    toggle()
  }

  return (
    <CheckboxContainer disabled={disabled}>
      <TamaguiCheckbox
        id={id}
        aria-label={ariaLabel ?? label}
        checked={isIndeterminate ? 'indeterminate' : isChecked}
        // The box takes its own presses (mouse and keyboard); they never
        // reach the container. Handle them here instead of through Tamagui's
        // controlled onCheckedChange, which didn't fire for a pressed box.
        onPress={e => {
          e?.preventDefault?.()
          e?.stopPropagation?.()
          toggle()
        }}
        disabled={disabled}
        size={sizeMap[size]}
        backgroundColor={
          isChecked || isIndeterminate ? brandColors.primary : 'transparent'
        }
        borderColor={
          isChecked || isIndeterminate
            ? brandColors.primary
            : neutralColors.border.default
        }
        borderWidth={2}
        borderRadius='$2'
        hoverStyle={{
          borderColor:
            isChecked || isIndeterminate
              ? brandColors.primary
              : neutralColors.border.strong,
        }}
      >
        <TamaguiCheckbox.Indicator>
          {isIndeterminate ? (
            <Minus
              size={iconSize}
              color={neutralColors.text.onFill}
              strokeWidth={3}
            />
          ) : (
            <Check
              size={iconSize}
              color={neutralColors.text.onFill}
              strokeWidth={3}
            />
          )}
        </TamaguiCheckbox.Indicator>
      </TamaguiCheckbox>
      {label && (
        <CheckboxLabel onPress={handleLabelPress}>
          <Text
            color={
              disabled ? neutralColors.text.muted : neutralColors.text.primary
            }
            fontSize={size === 'sm' ? 13 : 14}
          >
            {label}
          </Text>
        </CheckboxLabel>
      )}
    </CheckboxContainer>
  )
}

// Type exports
export type { CheckboxProps as StyledCheckboxProps }
