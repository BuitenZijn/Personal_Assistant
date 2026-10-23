import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { defaultScreenOptions } from '../screenOptions'
import { screenBoundaryLayout } from '../../components/ScreenBoundary'
import type { ShopStackParamList } from '../types'
import { ShopScreen } from '../../features/shop'

/**
 * Routes in this stack that hide the bottom tab bar.
 *
 * Declared next to the screens themselves so adding a full-bleed screen
 * is a one-file change; MainNavigator aggregates these.
 */
export const fullScreenRoutes = [] as const

const Stack = createStackNavigator<ShopStackParamList>()

export function ShopStack() {
  return (
    <Stack.Navigator
      screenOptions={defaultScreenOptions}
      screenLayout={screenBoundaryLayout('Shop')}
    >
      <Stack.Screen name='Shop' component={ShopScreen} />
    </Stack.Navigator>
  )
}
