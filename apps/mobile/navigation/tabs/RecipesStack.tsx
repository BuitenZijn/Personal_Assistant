import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { defaultScreenOptions } from '../screenOptions'
import { screenBoundaryLayout } from '../../components/ScreenBoundary'
import type { RecipesStackParamList } from '../types'
import {
  RecipesScreen,
  RecipeScreen,
  AddRecipeScreen,
} from '../../features/recipes'

/**
 * Routes in this stack that hide the bottom tab bar.
 *
 * Declared next to the screens themselves so adding a full-bleed screen
 * is a one-file change; MainNavigator aggregates these.
 */
export const fullScreenRoutes = ['Recipe', 'AddRecipe'] as const

const Stack = createStackNavigator<RecipesStackParamList>()

export function RecipesStack() {
  return (
    <Stack.Navigator
      screenOptions={defaultScreenOptions}
      screenLayout={screenBoundaryLayout('Recipes')}
    >
      <Stack.Screen name='Recipes' component={RecipesScreen} />
      <Stack.Screen name='Recipe' component={RecipeScreen} />
      <Stack.Screen name='AddRecipe' component={AddRecipeScreen} />
    </Stack.Navigator>
  )
}
