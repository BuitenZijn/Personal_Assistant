import React from 'react'
import { styled, XStack, GetProps } from 'tamagui'
import { MicroLabel } from './Typography'
import { neutralColors } from './colors'

/**
 * ChipFrame - Hairline chip frame for micro-label status/type chips.
 *
 * Instrument-system replacement for tinted Badge pills: 1px outline in the
 * status color, 6px radius, no background fill.
 */
export const ChipFrame = styled(XStack, {
  name: 'ChipFrame',
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  borderRadius: 6,
  paddingHorizontal: '$1.5',
  paddingVertical: 1,
  alignItems: 'center',
  gap: '$1',
})

export interface StatusChipProps extends GetProps<typeof ChipFrame> {
  /** Chip text, rendered as an uppercase micro-label. */
  label: string
  /** Outline and text color; defaults to the neutral hairline/secondary text. */
  color?: string
  /** Optional small (10-12px) leading icon, tinted by the caller. */
  icon?: React.ReactNode
}

/** Hairline uppercase status chip (DRAFT, OFFLINE, COMPLETED, ...). */
export function StatusChip({
  label,
  color,
  icon,
  ...frameProps
}: StatusChipProps) {
  return (
    <ChipFrame
      borderColor={color ?? neutralColors.border.default}
      {...frameProps}
    >
      {icon}
      <MicroLabel color={color ?? neutralColors.text.secondary}>
        {label}
      </MicroLabel>
    </ChipFrame>
  )
}
