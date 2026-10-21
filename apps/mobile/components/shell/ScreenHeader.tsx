import React from 'react'
import { TouchableOpacity } from 'react-native'
import { XStack, Text, neutralColors } from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import { ChevronLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ScreenHeaderProps {
  title: string
}

/**
 * ScreenHeader - Lightweight inline header with back chevron + title.
 *
 * Used on sub-screens (pushed from a tab root) to replace AppHeader's
 * back-navigation after removing the global header bar.
 */
export function ScreenHeader({ title }: ScreenHeaderProps) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const canGoBack = navigation.canGoBack()

  return (
    <XStack
      paddingTop={insets.top + 8}
      paddingHorizontal='$4'
      paddingBottom='$3'
      alignItems='center'
      gap='$2'
      backgroundColor={neutralColors.background.elevated}
      borderBottomWidth={1}
      borderBottomColor={neutralColors.border.subtle}
    >
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
      <Text size='$5' weight='bold' numberOfLines={1} flex={1}>
        {title}
      </Text>
    </XStack>
  )
}
