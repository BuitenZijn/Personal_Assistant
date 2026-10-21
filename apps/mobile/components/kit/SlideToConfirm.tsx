import React, { useState, useRef } from 'react'
import { Animated, PanResponder, Dimensions, StyleSheet } from 'react-native'
import { XStack, YStack, Text, brandColors, neutralColors } from '@pa/ui'
import { Check, ChevronRight } from 'lucide-react-native'

const SLIDER_WIDTH = Dimensions.get('window').width - 80 // 40px padding on each side
const THUMB_SIZE = 56
const TRACK_HEIGHT = 56
const CONFIRM_THRESHOLD = 0.85 // 85% slide to confirm

interface SlideToConfirmProps {
  /** Text shown while sliding */
  label?: string
  /** Text shown after confirmed */
  confirmedLabel?: string
  /** Called when slide completes */
  onConfirm: () => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * SlideToConfirm - Swipe gesture to confirm destructive actions
 *
 * A slider that requires the user to slide to the end to confirm.
 * Used for dangerous actions like stopping a quest.
 */
export function SlideToConfirm({
  label = 'Slide to confirm',
  confirmedLabel = 'Confirmed!',
  onConfirm,
  disabled = false,
}: SlideToConfirmProps) {
  const [confirmed, setConfirmed] = useState(false)
  const translateX = useRef(new Animated.Value(0)).current
  const maxSlide = SLIDER_WIDTH - THUMB_SIZE

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !confirmed,
      onMoveShouldSetPanResponder: () => !disabled && !confirmed,
      onPanResponderMove: (_, gestureState) => {
        // Clamp between 0 and maxSlide
        const newValue = Math.min(Math.max(0, gestureState.dx), maxSlide)
        translateX.setValue(newValue)
      },
      onPanResponderRelease: (_, gestureState) => {
        const percentage = gestureState.dx / maxSlide

        if (percentage >= CONFIRM_THRESHOLD) {
          // Snap to end and confirm
          Animated.spring(translateX, {
            toValue: maxSlide,
            useNativeDriver: false, // width animation not supported by native driver
            tension: 100,
            friction: 10,
          }).start(() => {
            setConfirmed(true)
            onConfirm()
          })
        } else {
          // Reset to start
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false, // width animation not supported by native driver
            tension: 100,
            friction: 10,
          }).start()
        }
      },
    }),
  ).current

  // Interpolate progress fill width (starts at thumb size, expands to full width)
  const progressWidth = translateX.interpolate({
    inputRange: [0, maxSlide],
    outputRange: [THUMB_SIZE, SLIDER_WIDTH],
    extrapolate: 'clamp',
  })

  // Fade text based on progress
  const textOpacity = translateX.interpolate({
    inputRange: [0, maxSlide * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  return (
    <YStack width='100%' alignItems='center'>
      {/* Track container */}
      <XStack
        width={SLIDER_WIDTH}
        height={TRACK_HEIGHT}
        backgroundColor={neutralColors.background.page}
        borderRadius={TRACK_HEIGHT / 2}
        borderWidth={1}
        borderColor={
          confirmed ? brandColors.primary : neutralColors.border.default
        }
        overflow='hidden'
        position='relative'
      >
        {/* Progress fill */}
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidth,
              backgroundColor: confirmed
                ? brandColors.primary
                : `${brandColors.primary}40`, // 25% opacity
            },
          ]}
        />

        {/* Label text */}
        <Animated.View
          style={[
            styles.labelContainer,
            { opacity: confirmed ? 0 : textOpacity },
          ]}
        >
          <Text variant='muted' size='$3' weight='semibold' textAlign='center'>
            {label}
          </Text>
        </Animated.View>

        {/* Confirmed text */}
        {confirmed && (
          <XStack
            position='absolute'
            top={0}
            left={0}
            right={0}
            bottom={0}
            alignItems='center'
            justifyContent='center'
          >
            <Text color={neutralColors.text.primary} size='$3' weight='bold'>
              {confirmedLabel}
            </Text>
          </XStack>
        )}

        {/* Thumb */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
              backgroundColor: confirmed
                ? brandColors.primary
                : neutralColors.background.elevated,
            },
          ]}
        >
          {confirmed ? (
            <Check size={20} color={neutralColors.text.primary} />
          ) : (
            <ChevronRight size={20} color={neutralColors.text.primary} />
          )}
        </Animated.View>
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: TRACK_HEIGHT / 2,
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: THUMB_SIZE,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: THUMB_SIZE - 8,
    height: THUMB_SIZE - 8,
    borderRadius: (THUMB_SIZE - 8) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: neutralColors.background.page,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
})

export default SlideToConfirm
