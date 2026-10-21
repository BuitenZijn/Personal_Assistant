import React from 'react'
import { Pressable } from 'react-native'
import { XStack, MicroLabel, Avatar, AvatarText } from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RemoteImage } from '../kit'
import { useCurrentUser } from '../../lib/useCurrentUser'
import { getInitials } from '../../lib/formatters'

interface TabHeaderProps {
  /** Screen name, rendered as the tracked uppercase wordmark-style label */
  title: string
  /** Optional action element rendered to the left of the avatar (e.g. a + button) */
  rightAction?: React.ReactNode
}

/**
 * TabHeader - Home-style header for tab root screens.
 *
 * Matches the Home screen's wordmark row: a tracked uppercase micro-label
 * on the left, the user avatar (→ Settings) on the right, transparent
 * background with no divider — instead of the boxed AppHeader bar.
 */
export function TabHeader({ title, rightAction }: TabHeaderProps) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { displayName, imageUrl: avatarUrl } = useCurrentUser()

  return (
    <XStack
      paddingHorizontal={22}
      paddingTop={insets.top + 12}
      paddingBottom='$3'
      alignItems='center'
      justifyContent='space-between'
    >
      <MicroLabel variant='secondary' letterSpacing={5} fontSize={13}>
        {title}
      </MicroLabel>
      <XStack alignItems='center' gap='$3'>
        {rightAction}
        <Pressable
          onPress={() => navigation.navigate('SettingsTab' as never)}
          accessibilityRole='button'
          accessibilityLabel='Open settings'
        >
          <Avatar size='$3' variant='primary'>
            {avatarUrl ? (
              <RemoteImage
                uri={avatarUrl}
                style={{ width: '100%', height: '100%', borderRadius: 999 }}
              />
            ) : (
              <AvatarText size='$1'>{getInitials(displayName)}</AvatarText>
            )}
          </Avatar>
        </Pressable>
      </XStack>
    </XStack>
  )
}
