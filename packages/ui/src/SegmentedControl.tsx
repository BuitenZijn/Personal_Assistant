import { styled, XStack, GetProps } from 'tamagui'
import { brandColors, neutralColors } from './colors'
import { keyboardPressable } from './pressable'
import { Text } from './Typography'

/**
 * SegmentedControl - A compact row of mutually exclusive options
 *
 * For switching a view between a handful of modes without spending the vertical
 * space a labelled `OptionSelector` needs: playback speed, a time-axis mode, a
 * chart's unit. Use `OptionSelector` inside forms instead — it carries a label
 * and description.
 *
 * Usage:
 * ```tsx
 * <SegmentedControl
 *   items={[
 *     { value: 'elapsed', label: 'Elapsed' },
 *     { value: 'clock', label: 'Clock' },
 *   ]}
 *   value={mode}
 *   onChange={setMode}
 * />
 * ```
 */

const SegmentedControlFrame = styled(XStack, {
  name: 'SegmentedControlFrame',
  backgroundColor: neutralColors.background.page,
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  borderRadius: '$3',
  padding: 2,
  gap: 2,
  alignItems: 'center',
})

const Segment = styled(XStack, {
  name: 'Segment',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$2',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  gap: '$1',

  hoverStyle: {
    backgroundColor: neutralColors.background.hover,
  },
  pressStyle: {
    opacity: 0.85,
  },

  variants: {
    selected: {
      true: {
        backgroundColor: brandColors.primary,
        hoverStyle: {
          backgroundColor: brandColors.primaryHover,
        },
      },
    },
    size: {
      small: {
        height: 24,
        paddingHorizontal: '$2',
      },
      medium: {
        height: 32,
        paddingHorizontal: '$3',
      },
    },
    // Segments share the frame's full width (mobile full-width toggles).
    stretch: {
      true: {
        flex: 1,
      },
    },
    disabled: {
      true: {
        opacity: 0.4,
        cursor: 'not-allowed',
        hoverStyle: {
          backgroundColor: 'transparent',
        },
      },
    },
  } as const,

  defaultVariants: {
    size: 'medium',
  },
})

export interface SegmentedControlItem<T extends string> {
  value: T
  label: string
  /**
   * Spelled-out name for screen readers, when `label` is an abbreviation such
   * as "16×". Falls back to `label`.
   */
  description?: string
  disabled?: boolean
}

export type SegmentedControlProps<T extends string> = Omit<
  GetProps<typeof SegmentedControlFrame>,
  'children' | 'onChange'
> & {
  items: Array<SegmentedControlItem<T>>
  value: T
  onChange: (value: T) => void
  size?: 'small' | 'medium'
  /** Segments share the frame's full width (mobile full-width toggles). */
  stretch?: boolean
  /** Accessible name for the group */
  ariaLabel?: string
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  size = 'medium',
  stretch = false,
  ariaLabel,
  ...frameProps
}: SegmentedControlProps<T>) {
  return (
    <SegmentedControlFrame
      role='radiogroup'
      aria-label={ariaLabel}
      {...frameProps}
    >
      {items.map(item => {
        const isSelected = item.value === value

        return (
          <Segment
            key={item.value}
            selected={isSelected}
            size={size}
            stretch={stretch}
            disabled={item.disabled}
            {...keyboardPressable(
              () => {
                if (!isSelected) onChange(item.value)
              },
              { role: 'radio', disabled: item.disabled },
            )}
            aria-checked={isSelected}
            aria-label={item.description ?? item.label}
            onPress={() => {
              if (!item.disabled && !isSelected) onChange(item.value)
            }}
          >
            <Text
              size={size === 'small' ? '$1' : '$2'}
              weight={isSelected ? 'bold' : 'medium'}
              variant={isSelected ? undefined : 'muted'}
              // Dark ink on the amber fill — never white-on-amber.
              color={isSelected ? neutralColors.background.page : undefined}
            >
              {item.label}
            </Text>
          </Segment>
        )
      })}
    </SegmentedControlFrame>
  )
}

export type SegmentedControlFrameProps = GetProps<typeof SegmentedControlFrame>
