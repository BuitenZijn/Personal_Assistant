import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { defaultScreenOptions } from '../screenOptions'
import { screenBoundaryLayout } from '../../components/ScreenBoundary'
import type { HomeStackParamList } from '../types'
import { HomeScreen } from '../../features/home'

/**
 * Routes in this stack that hide the bottom tab bar.
 *
 * Declared next to the screens themselves so adding a full-bleed screen
 * is a one-file change; MainNavigator aggregates these.
 */
export const fullScreenRoutes = [] as const

const Stack = createStackNavigator<HomeStackParamList>()

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={defaultScreenOptions}
      screenLayout={screenBoundaryLayout('Home')}
    >
      <Stack.Screen name='Home' component={HomeScreen} />
    </Stack.Navigator>
  )
}
