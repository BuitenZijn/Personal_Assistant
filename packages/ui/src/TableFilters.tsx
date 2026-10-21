import {
  styled,
  GetProps,
  XStack,
  YStack,
  Select as TamaguiSelect,
  Checkbox as TamaguiCheckbox,
} from 'tamagui'
import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { keyboardPressable } from './pressable'
import { neutralColors, brandColors } from './colors'
import { Text } from './Typography'
import { StyledInput } from './StyledInput'

// =============================================================================
// Filter Container Components
// =============================================================================

/**
 * FilterBar - Container for filter controls above a table
 */
export const FilterBar = styled(XStack, {
  name: 'FilterBar',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '$4',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  backgroundColor: neutralColors.background.elevated,
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: neutralColors.border.default,
})

/**
 * FilterGroup - Groups related filter controls together
 */
export const FilterGroup = styled(XStack, {
  name: 'FilterGroup',
  alignItems: 'center',
  gap: '$2',
})

/**
 * FilterLabel - Label text for a filter control
 */
export const FilterLabel = styled(Text, {
  name: 'FilterLabel',
  color: neutralColors.text.secondary,
  fontSize: 13,
  fontWeight: '500',
})

// =============================================================================
// Search Filter
// =============================================================================

interface SearchFilterProps {
  /** Current search value */
  value: string
  /** Callback when search value changes */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Width of the input */
  width?: number | string
  /** Search icon element */
  searchIcon?: ReactNode
  /** Clear icon element */
  clearIcon?: ReactNode
}

/**
 * SearchFilterContainer
 */
const SearchFilterContainer = styled(XStack, {
  name: 'SearchFilterContainer',
  alignItems: 'center',
  position: 'relative',
})

const ClearButton = styled(XStack, {
  name: 'ClearButton',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  position: 'absolute',
  right: 8,
  cursor: 'pointer',
  opacity: 0.7,
  hoverStyle: {
    opacity: 1,
  },
})

const SearchIconContainer = styled(XStack, {
  name: 'SearchIconContainer',
  position: 'absolute',
  left: 12,
  zIndex: 1,
})

/**
 * SearchFilter - A search input with debouncing and clear button
 */
export function SearchFilter({
  value,
  onChange,
  placeholder = 'Zoeken…',
  debounceMs = 300,
  width = 240,
  searchIcon,
  clearIcon,
}: SearchFilterProps) {
  const [localValue, setLocalValue] = useState(value)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce the onChange callback
  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => onChange(newValue), debounceMs)
    },
    [onChange, debounceMs],
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    debouncedOnChange(newValue)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <SearchFilterContainer width={width}>
      {searchIcon ? (
        <SearchIconContainer>{searchIcon}</SearchIconContainer>
      ) : null}
      <StyledInput
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        paddingLeft={searchIcon ? '$8' : '$3'}
        paddingRight={localValue ? '$8' : '$3'}
        width='100%'
      />
      {localValue && clearIcon ? (
        <ClearButton
          onPress={handleClear}
          {...keyboardPressable(handleClear)}
          aria-label='Zoekopdracht wissen'
        >
          {clearIcon}
        </ClearButton>
      ) : null}
    </SearchFilterContainer>
  )
}

// =============================================================================
// Select Filter (Single Selection)
// =============================================================================

interface SelectFilterOption {
  value: string
  label: string
}

interface SelectFilterProps {
  /** Current selected value */
  value: string | undefined
  /** Callback when selection changes */
  onChange: (value: string | undefined) => void
  /** Available options */
  options: SelectFilterOption[]
  /** Placeholder when nothing is selected */
  placeholder?: string
  /** Width of the select */
  width?: number | string
  /** Label for the filter */
  label?: string
  /** Allow clearing the selection */
  clearable?: boolean
  /** Icon element for dropdown indicator */
  chevronIcon?: React.ReactNode
  /** Icon element for check indicator */
  checkIcon?: React.ReactNode
}

/**
 * SelectFilter - Single selection dropdown filter
 */
export function SelectFilter({
  value,
  onChange,
  options,
  placeholder = 'Kiezen…',
  width = 180,
  label,
  clearable = true,
  chevronIcon,
  checkIcon,
}: SelectFilterProps) {
  const handleValueChange = (newValue: string) => {
    // Empty string means "clear"
    if (newValue === '__clear__') {
      onChange(undefined)
    } else {
      onChange(newValue)
    }
  }

  // Find current option label
  const currentOption = options.find(opt => opt.value === value)

  return (
    <FilterGroup>
      {label ? <FilterLabel>{label}</FilterLabel> : null}
      <TamaguiSelect
        value={value || ''}
        onValueChange={handleValueChange}
        size='$3'
      >
        <TamaguiSelect.Trigger
          width={width}
          backgroundColor={neutralColors.background.page}
          borderColor={neutralColors.border.default}
        >
          <TamaguiSelect.Value
            placeholder={placeholder}
            color={
              value ? neutralColors.text.primary : neutralColors.text.muted
            }
          >
            {currentOption?.label || placeholder}
          </TamaguiSelect.Value>
          {chevronIcon}
        </TamaguiSelect.Trigger>

        <TamaguiSelect.Content>
          <TamaguiSelect.Viewport>
            {clearable && value ? (
              <TamaguiSelect.Item index={-1} value='__clear__'>
                <TamaguiSelect.ItemText color={neutralColors.text.muted}>
                  Selectie wissen
                </TamaguiSelect.ItemText>
              </TamaguiSelect.Item>
            ) : null}
            {options.map((option, index) => (
              <TamaguiSelect.Item
                key={option.value}
                index={index}
                value={option.value}
              >
                <TamaguiSelect.ItemText>{option.label}</TamaguiSelect.ItemText>
                <TamaguiSelect.ItemIndicator>
                  {checkIcon}
                </TamaguiSelect.ItemIndicator>
              </TamaguiSelect.Item>
            ))}
          </TamaguiSelect.Viewport>
        </TamaguiSelect.Content>
      </TamaguiSelect>
    </FilterGroup>
  )
}

// =============================================================================
// Multi-Select Filter
// =============================================================================

interface MultiSelectFilterProps {
  /** Currently selected values */
  value: string[]
  /** Callback when selection changes */
  onChange: (value: string[]) => void
  /** Available options */
  options: SelectFilterOption[]
  /** Placeholder when nothing is selected */
  placeholder?: string
  /** Label for the filter */
  label?: string
  /** Chevron down icon element */
  chevronIcon?: ReactNode
  /** Check icon element */
  checkIcon?: ReactNode
  /** X/close icon element */
  closeIcon?: ReactNode
}

/**
 * MultiSelectChip - Styled chip for selected items
 */
const MultiSelectChip = styled(XStack, {
  name: 'MultiSelectChip',
  alignItems: 'center',
  gap: '$1',
  backgroundColor: brandColors.primaryLight,
  borderRadius: '$2',
  paddingVertical: '$1',
  paddingHorizontal: '$2',
})

const MultiSelectChipText = styled(Text, {
  name: 'MultiSelectChipText',
  color: brandColors.primary,
  fontSize: 12,
  fontWeight: '500',
})

/**
 * MultiSelectContainer - Container for multi-select dropdown
 */
const MultiSelectContainer = styled(YStack, {
  name: 'MultiSelectContainer',
  position: 'relative',
})

const MultiSelectTrigger = styled(XStack, {
  name: 'MultiSelectTrigger',
  alignItems: 'center',
  justifyContent: 'space-between',
  minWidth: 180,
  minHeight: 36,
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  backgroundColor: neutralColors.background.page,
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  borderRadius: '$3',
  cursor: 'pointer',
  gap: '$2',
  flexWrap: 'wrap',

  hoverStyle: {
    borderColor: neutralColors.border.strong,
  },
})

const MultiSelectDropdown = styled(YStack, {
  name: 'MultiSelectDropdown',
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 200000,
  backgroundColor: neutralColors.background.elevated,
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  borderRadius: '$3',
  marginTop: '$1',
  padding: '$2',
  gap: '$1',
  maxHeight: 300,
  // Note: overflow scroll is web-specific, handled by browser
})

const MultiSelectOption = styled(XStack, {
  name: 'MultiSelectOption',
  alignItems: 'center',
  gap: '$2',
  paddingVertical: '$2',
  paddingHorizontal: '$2',
  borderRadius: '$2',
  cursor: 'pointer',

  hoverStyle: {
    backgroundColor: neutralColors.background.hover,
  },
})

const ChipRemoveButton = styled(XStack, {
  name: 'ChipRemoveButton',
  cursor: 'pointer',
})

/**
 * MultiSelectFilter - Multi-selection filter with checkboxes
 */
export function MultiSelectFilter({
  value,
  onChange,
  options,
  placeholder = 'Kiezen…',
  label,
  chevronIcon,
  checkIcon,
  closeIcon,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const removeChip = (
    e: { stopPropagation?: () => void },
    optionValue: string,
  ) => {
    e.stopPropagation?.()
    onChange(value.filter(v => v !== optionValue))
  }

  const selectedOptions = options.filter(opt => value.includes(opt.value))

  return (
    <FilterGroup>
      {label ? <FilterLabel>{label}</FilterLabel> : null}
      <MultiSelectContainer>
        <MultiSelectTrigger
          onPress={() => setIsOpen(!isOpen)}
          {...keyboardPressable(() => setIsOpen(!isOpen))}
          aria-expanded={isOpen}
        >
          {selectedOptions.length === 0 ? (
            <Text color={neutralColors.text.muted} fontSize={14}>
              {placeholder}
            </Text>
          ) : (
            <XStack flexWrap='wrap' gap='$1' flex={1}>
              {selectedOptions.map(opt => (
                <MultiSelectChip key={opt.value}>
                  <MultiSelectChipText>{opt.label}</MultiSelectChipText>
                  {closeIcon ? (
                    <ChipRemoveButton
                      onPress={(e: { stopPropagation?: () => void }) =>
                        removeChip(e, opt.value)
                      }
                      {...keyboardPressable(() => removeChip({}, opt.value))}
                      aria-label={`${opt.label} verwijderen`}
                    >
                      {closeIcon}
                    </ChipRemoveButton>
                  ) : null}
                </MultiSelectChip>
              ))}
            </XStack>
          )}
          {chevronIcon}
        </MultiSelectTrigger>

        {isOpen ? (
          <MultiSelectDropdown role='group' aria-label={label}>
            {options.map(option => (
              <MultiSelectOption
                key={option.value}
                onPress={() => toggleOption(option.value)}
                {...keyboardPressable(() => toggleOption(option.value), {
                  role: 'checkbox',
                })}
                aria-checked={value.includes(option.value)}
              >
                {/* Decorative: the option is the control. A press on an
                    interactive box would stop there and toggle nothing. */}
                <TamaguiCheckbox
                  aria-hidden
                  tabIndex={-1}
                  pointerEvents='none'
                  checked={value.includes(option.value)}
                  size='$3'
                  backgroundColor={
                    value.includes(option.value)
                      ? brandColors.primary
                      : 'transparent'
                  }
                  borderColor={
                    value.includes(option.value)
                      ? brandColors.primary
                      : neutralColors.border.default
                  }
                >
                  <TamaguiCheckbox.Indicator>
                    {checkIcon}
                  </TamaguiCheckbox.Indicator>
                </TamaguiCheckbox>
                <Text color={neutralColors.text.primary} fontSize={14}>
                  {option.label}
                </Text>
              </MultiSelectOption>
            ))}
          </MultiSelectDropdown>
        ) : null}
      </MultiSelectContainer>
    </FilterGroup>
  )
}

// =============================================================================
// Type Exports
// =============================================================================

export type FilterBarProps = GetProps<typeof FilterBar>
export type FilterGroupProps = GetProps<typeof FilterGroup>
export type FilterLabelProps = GetProps<typeof FilterLabel>
export type {
  SearchFilterProps,
  SelectFilterProps,
  SelectFilterOption,
  MultiSelectFilterProps,
}
