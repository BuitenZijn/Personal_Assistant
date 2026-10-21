import React from 'react'
import { TouchableOpacity } from 'react-native'
import { RemoteImage } from '../kit'
import { XStack, Text, Avatar, AvatarText, neutralColors } from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import { ChevronLeft } from 'lucide-react-native'
import { useCurrentUser } from '../../lib/useCurrentUser'
import { getInitials, truncateName } from '../../lib/formatters'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface AppHeaderProps {
  /** Title text shown in the breadcrumb area */
  title?: string
  /** Override back button visibility. Default: auto-detect via canGoBack(). Set false on tab roots. */
  showBack?: boolean
  /** Optional action element rendered to the left of the avatar (e.g. a + button) */
  rightAction?: React.ReactNode
}

/**
 * AppHeader - Minimal header with breadcrumb (left) and user avatar (right).
 *
 * Left side: Back chevron + screen title (breadcrumb). Back button hidden on tab roots.
 * Right side: Optional action + user avatar (image or initials) + first name → taps to Settings.
 */
export function AppHeader({ title, showBack, rightAction }: AppHeaderProps) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const canGoBack = showBack ?? navigation.canGoBack()
  const { displayName, imageUrl: avatarUrl } = useCurrentUser()

  return (
    <XStack
      paddingHorizontal='$4'
      paddingVertical='$3'
      paddingTop={insets.top + 8}
      alignItems='center'
      justifyContent='space-between'
      backgroundColor={neutralColors.background.elevated}
      borderBottomWidth={1}
      borderBottomColor={neutralColors.border.subtle}
    >
      {/* Left: Breadcrumb */}
      <XStack alignItems='center' gap='$1' flex={1}>
        {canGoBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole='button'
            accessibilityLabel='Back'
          >
            <ChevronLeft size={22} color={neutralColors.text.primary} />
          </TouchableOpacity>
        )}
        <Text size='$6' weight='bold' numberOfLines={1}>
          {title ?? 'Personal Assistant'}
        </Text>
      </XStack>

      {/* Right: Optional action + User Avatar + Name → taps to Settings */}
      <XStack alignItems='center' gap='$3'>
        {rightAction}
        <TouchableOpacity
          onPress={() => navigation.navigate('SettingsTab' as never)}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel='Open settings'
        >
          <XStack alignItems='center' gap='$2'>
            <Text size='$3' weight='medium' numberOfLines={1}>
              {truncateName(displayName)}
            </Text>
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
          </XStack>
        </TouchableOpacity>
      </XStack>
    </XStack>
  )
}
