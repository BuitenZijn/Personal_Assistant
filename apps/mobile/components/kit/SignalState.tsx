import React, { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated'
import {
  YStack,
  MonoText,
  MicroLabel,
  brandColors,
  neutralColors,
} from '@pa/ui'

function Ping({
  size,
  delay,
  color,
  reduceMotion,
}: {
  size: number
  delay: number
  color: string
  reduceMotion: boolean
}) {
  const t = useSharedValue(reduceMotion ? 0.5 : 0)

  useEffect(() => {
    if (reduceMotion) return
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    )
  }, [t, delay, reduceMotion])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(t.value, [0, 1], [0.35, 1]) }],
    opacity: interpolate(t.value, [0, 0.7, 1], [0.45, 0.15, 0]),
  }))

  return (
    <Animated.View
      pointerEvents='none'
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
        },
        style,
      ]}
    />
  )
}

export interface SignalStateProps {
  /** Center glyph (a lucide icon sized ~28) */
  icon: React.ReactNode
  /** Mono status line (AWAITING NEXT READING) */
  label: string
  /** Muted explainer under the label */
  sublabel?: string
  /** Ring color, teal by default (status) */
  color?: string
  /** Ping field diameter */
  size?: number
}

/**
 * SignalState - a radar-ping waiting state. Replaces the grey circle +
 * clock placeholders for "waiting for GPS / next reading" moments.
 */
export function SignalState({
  icon,
  label,
  sublabel,
  color = brandColors.secondary,
  size = 180,
}: SignalStateProps) {
  const reduceMotion = useReducedMotion()
  return (
    <YStack alignItems='center' gap='$4'>
      <YStack
        width={size}
        height={size}
        alignItems='center'
        justifyContent='center'
      >
        <Ping size={size} delay={0} color={color} reduceMotion={reduceMotion} />
        <Ping
          size={size}
          delay={730}
          color={color}
          reduceMotion={reduceMotion}
        />
        <Ping
          size={size}
          delay={1460}
          color={color}
          reduceMotion={reduceMotion}
        />
        <YStack
          width={56}
          height={56}
          borderRadius={28}
          borderWidth={1}
          borderColor={neutralColors.border.strong}
          alignItems='center'
          justifyContent='center'
        >
          {icon}
        </YStack>
      </YStack>
      <YStack alignItems='center' gap='$2'>
        <MonoText size='$2' variant='success' letterSpacing={1.2}>
          {label}
        </MonoText>
        {sublabel ? <MicroLabel>{sublabel}</MicroLabel> : null}
      </YStack>
    </YStack>
  )
}
