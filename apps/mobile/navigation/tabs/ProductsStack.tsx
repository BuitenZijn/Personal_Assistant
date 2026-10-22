import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { defaultScreenOptions } from '../screenOptions'
import { screenBoundaryLayout } from '../../components/ScreenBoundary'
import type { ProductsStackParamList } from '../types'
import { ProductsScreen } from '../../features/products'

/**
 * Routes in this stack that hide the bottom tab bar.
 *
 * Declared next to the screens themselves so adding a full-bleed screen
 * is a one-file change; MainNavigator aggregates these.
 */
export const fullScreenRoutes = [] as const

const Stack = createStackNavigator<ProductsStackParamList>()

export function ProductsStack() {
  return (
    <Stack.Navigator
      screenOptions={defaultScreenOptions}
      screenLayout={screenBoundaryLayout('Products')}
    >
      <Stack.Screen name='Products' component={ProductsScreen} />
    </Stack.Navigator>
  )
}
