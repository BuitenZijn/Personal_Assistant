import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { defaultScreenOptions } from '../screenOptions'
import { screenBoundaryLayout } from '../../components/ScreenBoundary'
import type { SettingsStackParamList } from '../types'
import {
  SettingsScreen,
  EditNameScreen,
  ChangePasswordScreen,
  ProfilePictureScreen,
  AccountPrivacyScreen,
} from '../../features/settings'

/**
 * Routes in this stack that hide the bottom tab bar.
 *
 * Declared next to the screens themselves so adding a full-bleed screen
 * is a one-file change; MainNavigator aggregates these.
 */
export const fullScreenRoutes = [
  'EditName',
  'ChangePassword',
  'ProfilePicture',
  'AccountPrivacy',
] as const

const Stack = createStackNavigator<SettingsStackParamList>()

export function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={defaultScreenOptions}
      screenLayout={screenBoundaryLayout('Settings')}
    >
      <Stack.Screen name='Settings' component={SettingsScreen} />
      <Stack.Screen name='EditName' component={EditNameScreen} />
      <Stack.Screen name='ChangePassword' component={ChangePasswordScreen} />
      <Stack.Screen name='ProfilePicture' component={ProfilePictureScreen} />
      <Stack.Screen name='AccountPrivacy' component={AccountPrivacyScreen} />
    </Stack.Navigator>
  )
}
