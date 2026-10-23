import React from 'react'
import { Platform } from 'react-native'
import { YStack, neutralColors } from '@pa/ui'

/** The column the website keeps the app in on wide screens. */
const MAX_WIDTH = 720

/**
 * On the website, the app in a centred column on the page background, so
 * it reads like the phone app instead of stretching across a wide window.
 * On a phone it adds nothing.
 */
export function WebFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>
  return (
    <YStack
      flex={1}
      alignItems='center'
      backgroundColor={neutralColors.background.page}
    >
      <YStack
        flex={1}
        width='100%'
        maxWidth={MAX_WIDTH}
        borderLeftWidth={1}
        borderRightWidth={1}
        borderColor={neutralColors.border.subtle}
      >
        {children}
      </YStack>
    </YStack>
  )
}
