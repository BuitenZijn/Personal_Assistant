import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { defaultScreenOptions } from '../screenOptions'
import { screenBoundaryLayout } from '../../components/ScreenBoundary'
import type { HouseholdStackParamList } from '../types'
import {
  HouseholdScreen,
  PersonScreen,
  HouseholdSettingsScreen,
  InviteScreen,
  JoinHouseholdScreen,
} from '../../features/household'

/**
 * Routes in this stack that hide the bottom tab bar.
 *
 * Declared next to the screens themselves so adding a full-bleed screen
 * is a one-file change; MainNavigator aggregates these.
 */
export const fullScreenRoutes = [
  'Person',
  'HouseholdSettings',
  'Invite',
  'JoinHousehold',
] as const

const Stack = createStackNavigator<HouseholdStackParamList>()

export function HouseholdStack() {
  return (
    <Stack.Navigator
      screenOptions={defaultScreenOptions}
      screenLayout={screenBoundaryLayout('Household')}
    >
      <Stack.Screen name='Household' component={HouseholdScreen} />
      <Stack.Screen name='Person' component={PersonScreen} />
      <Stack.Screen
        name='HouseholdSettings'
        component={HouseholdSettingsScreen}
      />
      <Stack.Screen name='Invite' component={InviteScreen} />
      <Stack.Screen name='JoinHousehold' component={JoinHouseholdScreen} />
    </Stack.Navigator>
  )
}
