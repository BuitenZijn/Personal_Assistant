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
  RecipeSitesScreen,
} from '../../features/settings'

const Stack = createStackNavigator<SettingsStackParamList>()

/**
 * Settings, opened from the avatar in the header. It has no tab of its own,
 * so the tab bar is hidden on all of its screens (see MainNavigator).
 */
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
      <Stack.Screen name='RecipeSites' component={RecipeSitesScreen} />
    </Stack.Navigator>
  )
}
