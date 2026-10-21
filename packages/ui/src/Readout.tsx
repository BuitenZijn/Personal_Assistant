import React from 'react'
import { XStack, YStack, GetProps } from 'tamagui'
import { MonoText, MicroLabel } from './Typography'

export interface ReadoutProps {
  /** Micro-label caption under the value (FLIPS, TARGET, MAINTAINED) */
  label: string
  /** Mono value above the label (00, 5.0 KM/H, 02/10) */
  value: string
  /** Value tone — teal for live status, amber for attention */
  tone?: 'default' | 'success' | 'brand' | 'subtle'
  align?: 'flex-start' | 'center' | 'flex-end'
}

/**
 * Readout - one instrument label/value pair. The single way game and
 * gameplay screens render counters, replacing ad-hoc `Flips: 0` text.
 */
export function Readout({
  label,
  value,
  tone = 'default',
  align = 'flex-start',
}: ReadoutProps) {
  return (
    <YStack alignItems={align} gap={2}>
      <MonoText size='$3' weight='semibold' variant={tone}>
        {value}
      </MonoText>
      <MicroLabel>{label}</MicroLabel>
    </YStack>
  )
}

/** Row of Readouts spread across the width. */
export const ReadoutRow = XStack.styleable((props, ref) => (
  <XStack
    ref={ref}
    justifyContent='space-between'
    alignItems='flex-end'
    {...props}
  />
))
export type ReadoutRowProps = GetProps<typeof ReadoutRow>
