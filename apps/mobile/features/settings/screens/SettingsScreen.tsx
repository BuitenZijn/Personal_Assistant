import React from 'react'
import { Alert, ScrollView } from 'react-native'
import {
  YStack,
  Text,
  XStack,
  Button,
  ButtonText,
  MicroLabel,
  neutralColors,
} from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { MainStackParamList } from '../../../navigation/types'
import { useAuthActions } from '@convex-dev/auth/react'
import * as Application from 'expo-application'
import {
  ChevronRight,
  Info,
  User,
  Lock,
  Camera,
  UserRoundCog,
  Globe,
} from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { AppShell } from '../../../components/shell'

type NavigationProp = StackNavigationProp<MainStackParamList>

function SettingsRow({
  Icon,
  label,
  onPress,
  hint,
}: {
  Icon: LucideIcon
  label: string
  onPress: () => void
  hint?: string
}) {
  return (
    <Button
      variant='ghost-row'
      size='$3'
      onPress={onPress}
      icon={<Icon size={18} color={neutralColors.text.secondary} />}
      iconAfter={<ChevronRight size={18} color={neutralColors.text.muted} />}
      accessibilityHint={hint}
    >
      <ButtonText flex={1} textAlign='left'>
        {label}
      </ButtonText>
    </Button>
  )
}

/**
 * SettingsScreen - profile, account and app information. Opened from the
 * avatar in the header; back returns to the tab it was opened from.
 */
export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { signOut } = useAuthActions()

  const appVersion = Application.nativeApplicationVersion ?? 'unknown'
  const buildNumber = Application.nativeBuildVersion ?? ''

  const handleLogout = () => {
    Alert.alert('Sign out', 'Do you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void signOut(),
      },
    ])
  }

  return (
    <AppShell title='Settings' showBack>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <YStack flex={1} padding='$4' gap='$4'>
          <YStack gap='$2'>
            <MicroLabel paddingHorizontal='$1'>Profile</MicroLabel>
            <SettingsRow
              Icon={User}
              label='Name'
              onPress={() => navigation.navigate('EditName')}
            />
            <SettingsRow
              Icon={Lock}
              label='Password'
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <SettingsRow
              Icon={Camera}
              label='Profile picture'
              onPress={() => navigation.navigate('ProfilePicture')}
            />
          </YStack>

          <YStack gap='$2'>
            <MicroLabel paddingHorizontal='$1'>Meal planning</MicroLabel>
            <SettingsRow
              Icon={Globe}
              label='Recipe sites'
              onPress={() => navigation.navigate('RecipeSites')}
            />
          </YStack>

          <YStack gap='$2'>
            <MicroLabel paddingHorizontal='$1'>Account</MicroLabel>
            <SettingsRow
              Icon={UserRoundCog}
              label='Account & privacy'
              onPress={() => navigation.navigate('AccountPrivacy')}
            />
          </YStack>

          <Button variant='danger' onPress={handleLogout}>
            <ButtonText>Sign out</ButtonText>
          </Button>

          <YStack alignItems='center' paddingTop='$4' gap='$1'>
            <XStack alignItems='center' gap='$2'>
              <Info size={14} color={neutralColors.text.muted} />
              <Text size='$2' variant='muted'>
                Personal Assistant v{appVersion}
                {buildNumber ? ` (${buildNumber})` : ''}
              </Text>
            </XStack>
            <Text size='$1' variant='muted'>
              Your household shopping
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </AppShell>
  )
}

export default SettingsScreen
