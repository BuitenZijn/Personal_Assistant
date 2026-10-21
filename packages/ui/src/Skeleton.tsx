import React, { useEffect, useState } from 'react'
import { View, YStack, type YStackProps } from 'tamagui'
import { neutralColors } from './colors'

/** How long each half of the pulse takes. */
const PULSE_INTERVAL_MS = 800
const PULSE_MIN_OPACITY = 0.45

export interface SkeletonProps extends YStackProps {
  /** Width of the skeleton element */
  width?: number | string
  /** Height of the skeleton element */
  height?: number | string
  /** Border radius. Use 999 for circular. Default: 8 */
  radius?: number
}

/**
 * Skeleton - Animated placeholder for loading states.
 *
 * Pulses to indicate content is loading.
 *
 * The pulse is driven by a timer rather than a CSS animation: this component
 * is shared with the mobile app, where `animationName` is not a thing and the
 * skeleton simply sat there motionless. A timer is the one mechanism that
 * behaves the same in both renderers without pulling react-native (or
 * react-native-web) into the other platform's bundle.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  ...rest
}: SkeletonProps) {
  const [dim, setDim] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setDim(d => !d), PULSE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <YStack {...rest}>
      <View
        width={width}
        height={height}
        borderRadius={radius}
        backgroundColor={neutralColors.border.default}
        opacity={dim ? PULSE_MIN_OPACITY : 1}
      />
    </YStack>
  )
}

/** Pre-composed skeleton for a quest card in a list */
export function QuestCardSkeleton() {
  return (
    <YStack
      padding='$4'
      gap='$3'
      borderRadius='$4'
      backgroundColor={neutralColors.background.elevated}
    >
      <Skeleton width='100%' height={140} radius={12} />
      <Skeleton width='65%' height={18} />
      <Skeleton width='40%' height={14} />
      <Skeleton width='90%' height={12} />
    </YStack>
  )
}

/** Skeleton list showing N placeholder cards */
export function QuestListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <YStack gap='$3' padding='$4'>
      {Array.from({ length: count }).map((_, i) => (
        <QuestCardSkeleton key={i} />
      ))}
    </YStack>
  )
}
