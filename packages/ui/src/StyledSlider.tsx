import { styled, Slider, GetProps, XStack, YStack } from 'tamagui'
import { brandColors, neutralColors } from './colors'
import { Text } from './Typography'

/**
 * StyledSlider - Tamagui Slider with Digital Compass styling
 *
 * Pre-styled with proper dark theme colors:
 * - Deep Slate track background
 * - Solar Amber active track and thumb
 * - Proper sizing for touch targets
 *
 * Usage:
 * ```tsx
 * <StyledSlider
 *   value={[50]}
 *   onValueChange={(values) => setValue(values[0])}
 *   min={0}
 *   max={100}
 *   step={1}
 * />
 * ```
 */

const SliderTrack = styled(Slider.Track, {
  name: 'SliderTrack',
  backgroundColor: neutralColors.border.default,
  height: 6,
  borderRadius: 3,
})

const SliderTrackActive = styled(Slider.TrackActive, {
  name: 'SliderTrackActive',
  backgroundColor: brandColors.primary,
  borderRadius: 3,
})

const SliderThumb = styled(Slider.Thumb, {
  name: 'SliderThumb',
  backgroundColor: brandColors.primary,
  borderWidth: 0,
  borderColor: 'transparent',
  width: 16,
  height: 16,
  borderRadius: 8,
  cursor: 'pointer',
  // Override default Tamagui sizing
  size: 16,
  minWidth: 16,
  minHeight: 16,
  maxWidth: 16,
  maxHeight: 16,

  hoverStyle: {
    backgroundColor: brandColors.primaryHover,
    scale: 1.05,
  },

  focusStyle: {
    backgroundColor: brandColors.primaryHover,
  },

  pressStyle: {
    scale: 0.95,
  },
})

const StyledSliderFrame = styled(Slider, {
  name: 'StyledSlider',
  width: '100%',

  variants: {
    size: {
      small: {
        height: 20,
      },
      medium: {
        height: 24,
      },
      large: {
        height: 32,
      },
    },
  } as const,

  defaultVariants: {
    size: 'medium',
  },
})

export type StyledSliderProps = GetProps<typeof StyledSliderFrame> & {
  /** Current value(s) - use single-element array for single thumb */
  value: number[]
  /** Called when value changes */
  onValueChange: (value: number[]) => void
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step increment */
  step?: number
  /** Whether the slider is disabled */
  disabled?: boolean
}

/**
 * StyledSlider Component
 *
 * A styled slider component following the Digital Compass design system.
 * Uses Solar Amber for the active track and thumb.
 */
export function StyledSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  ...props
}: StyledSliderProps) {
  return (
    <StyledSliderFrame
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      opacity={disabled ? 0.5 : 1}
      {...props}
    >
      <SliderTrack>
        <SliderTrackActive />
      </SliderTrack>
      <SliderThumb index={0} />
    </StyledSliderFrame>
  )
}

export type SliderWithLabelProps = StyledSliderProps & {
  /** Label text */
  label?: string
  /** Unit suffix (e.g., "m", "%", "px") */
  unit?: string
  /** Whether to show the current value */
  showValue?: boolean
  /** Format function for the displayed value */
  formatValue?: (value: number) => string
}

/**
 * SliderWithLabel Component
 *
 * A slider with an integrated label and value display.
 * Perfect for settings panels and editors.
 *
 * Usage:
 * ```tsx
 * <SliderWithLabel
 *   label="Arrival Radius"
 *   value={[radius]}
 *   onValueChange={(values) => setRadius(values[0])}
 *   min={10}
 *   max={200}
 *   unit="m"
 *   showValue
 * />
 * ```
 */
export function SliderWithLabel({
  label,
  unit = '',
  showValue = true,
  formatValue,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  ...props
}: SliderWithLabelProps) {
  const displayValue = formatValue
    ? formatValue(value[0] ?? 0)
    : `${value[0] ?? 0}${unit}`

  return (
    <YStack gap='$2' width='100%'>
      {(label || showValue) && (
        <XStack justifyContent='space-between' alignItems='center'>
          {label && (
            <Text size='$2' variant='muted' weight='semibold'>
              {label}
            </Text>
          )}
          {showValue && (
            <Text size='$3' weight='bold' color={brandColors.primary}>
              {displayValue}
            </Text>
          )}
        </XStack>
      )}
      <StyledSlider
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        {...props}
      />
    </YStack>
  )
}
