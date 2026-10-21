import { styled, XStack, GetProps } from 'tamagui'
import { Battery } from 'lucide-react'
import { keyboardPressable } from './pressable'
import { Text } from './Typography'
import {
  semanticColors,
  neutralColors,
  teamColors,
  type TeamColor,
} from './colors'

// =============================================================================
// Online Status Indicator
// =============================================================================

/**
 * StatusDot - A small colored dot for status indication
 */
export const StatusDot = styled(XStack, {
  name: 'StatusDot',
  width: 8,
  height: 8,
  borderRadius: 100,

  variants: {
    status: {
      online: {
        backgroundColor: semanticColors.success.main,
      },
      offline: {
        backgroundColor: neutralColors.text.muted,
      },
      active: {
        backgroundColor: semanticColors.success.main,
      },
      paused: {
        backgroundColor: semanticColors.warning.main,
      },
      error: {
        backgroundColor: semanticColors.error.main,
      },
    },
    size: {
      small: {
        width: 6,
        height: 6,
      },
      medium: {
        width: 8,
        height: 8,
      },
      large: {
        width: 10,
        height: 10,
      },
    },
  } as const,

  defaultVariants: {
    status: 'offline',
    size: 'medium',
  },
})

/**
 * OnlineIndicator - Shows online/offline status with icon and text
 */
interface OnlineIndicatorProps {
  isOnline: boolean
  showText?: boolean
  size?: 'small' | 'medium'
  isBackground?: boolean
}

export function OnlineIndicator({
  isOnline,
  showText = true,
  size = 'medium',
  isBackground = false,
}: OnlineIndicatorProps) {
  // Determine the display status
  const status = !isOnline ? 'offline' : isBackground ? 'paused' : 'online'
  const label = !isOnline ? 'Offline' : isBackground ? 'Background' : 'Online'
  const textVariant = !isOnline
    ? 'subtle'
    : isBackground
      ? 'warning'
      : 'success'

  return (
    <XStack gap='$1' alignItems='center'>
      <StatusDot status={status} size={size} />
      {showText && (
        <Text
          size={size === 'small' ? '$1' : '$2'}
          variant={textVariant as 'success' | 'warning' | 'subtle'}
        >
          {label}
        </Text>
      )}
    </XStack>
  )
}

// =============================================================================
// Color Picker
// =============================================================================

interface ColorSwatchButtonProps {
  color: string
  isSelected: boolean
  onPress: () => void
  size?: number
}

/**
 * ColorSwatchButton - A single color swatch button for selection
 */
export function ColorSwatchButton({
  color,
  isSelected,
  onPress,
  size = 20,
}: ColorSwatchButtonProps) {
  return (
    <XStack
      width={size}
      height={size}
      borderRadius='$2'
      backgroundColor={color}
      borderWidth={isSelected ? 2 : 0}
      borderColor={neutralColors.text.primary}
      cursor='pointer'
      hoverStyle={{ opacity: 0.8 }}
      pressStyle={{ scale: 0.9 }}
      onPress={onPress}
      {...keyboardPressable(onPress)}
      aria-label={color}
      aria-pressed={isSelected}
    />
  )
}

interface TeamColorPickerProps {
  value: string
  onChange: (color: string) => void
  size?: number
}

/**
 * TeamColorPicker - A color picker using the predefined team colors
 */
export function TeamColorPicker({
  value,
  onChange,
  size = 20,
}: TeamColorPickerProps) {
  return (
    <XStack gap='$1' flexWrap='wrap'>
      {teamColors.map(color => (
        <ColorSwatchButton
          key={color}
          color={color}
          isSelected={value === color}
          onPress={() => onChange(color)}
          size={size}
        />
      ))}
    </XStack>
  )
}

/**
 * Get the next available team color that hasn't been used
 */
export function getNextTeamColor(usedColors: string[]): TeamColor {
  const available = teamColors.find(c => !usedColors.includes(c))
  return available || teamColors[0]
}

// =============================================================================
// Device Type Icon Container
// =============================================================================

/**
 * DeviceIconContainer - Wrapper to indicate which icon to use based on device type
 * Note: The actual icon rendering should be done by the consumer using Lucide icons
 */
export const DeviceIconContainer = styled(XStack, {
  name: 'DeviceIconContainer',
  alignItems: 'center',
  justifyContent: 'center',
})

// =============================================================================
// Selectable Card
// =============================================================================

/**
 * SelectableCard - A card that can be selected/highlighted
 */
export const SelectableCard = styled(XStack, {
  name: 'SelectableCard',
  padding: '$3',
  borderRadius: '$3',
  borderWidth: 1,
  gap: '$3',
  alignItems: 'center',
  cursor: 'pointer',

  variants: {
    selected: {
      true: {
        backgroundColor: '$primaryLight',
        borderColor: '$primary',
      },
      false: {
        backgroundColor: neutralColors.background.elevated,
        borderColor: neutralColors.border.default,
      },
    },
  } as const,

  defaultVariants: {
    selected: false,
  },
})

// =============================================================================
// Battery Indicator
// =============================================================================

/**
 * Calculate battery status from level (0-1)
 */
export function getBatteryStatus(level: number): {
  percentage: number
  variant: 'success' | 'warning' | 'error'
  color: string
} {
  const percentage = Math.round(level * 100)

  if (percentage > 50) {
    return {
      percentage,
      variant: 'success',
      color: semanticColors.success.text,
    }
  } else if (percentage > 20) {
    return {
      percentage,
      variant: 'warning',
      color: semanticColors.warning.text,
    }
  } else {
    return { percentage, variant: 'error', color: semanticColors.error.text }
  }
}

interface BatteryIndicatorProps {
  /** Battery level from 0-1 */
  level?: number
  /** Size of the indicator - affects both icon and text */
  size?: 'small' | 'medium'
  /** Whether to show the percentage text */
  showText?: boolean
}

/**
 * BatteryIndicator - Shows battery level with appropriate color coding
 *
 * Automatically calculates percentage and applies color based on level:
 * - >50%: green (success)
 * - >20%: yellow (warning)
 * - ≤20%: red (error)
 */
export function BatteryIndicator({
  level,
  size = 'medium',
  showText = true,
}: BatteryIndicatorProps) {
  if (level === undefined) return null

  const { percentage, variant, color } = getBatteryStatus(level)
  const textSize = size === 'small' ? '$1' : '$2'
  const iconSize = size === 'small' ? 14 : 16

  return (
    <XStack gap='$1' alignItems='center'>
      <Battery size={iconSize} color={color} />
      {showText && (
        <Text size={textSize} variant={variant}>
          {percentage}%
        </Text>
      )}
    </XStack>
  )
}

// =============================================================================
// Type Exports
// =============================================================================

export type StatusDotProps = GetProps<typeof StatusDot>
export type SelectableCardProps = GetProps<typeof SelectableCard>
