import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { getFocusedRouteNameFromRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import {
  ChefHat,
  CalendarDays,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react-native'
import { YStack, brandColors, neutralColors, fontFaces } from '@pa/ui'
import type { LucideIcon } from 'lucide-react-native'
import type { MainTabParamList } from './types'
import {
  HomeStack,
  RecipesStack,
  ProductsStack,
  HouseholdStack,
  ShopStack,
  SettingsStack,
  homeFullScreenRoutes,
  recipesFullScreenRoutes,
  productsFullScreenRoutes,
  householdFullScreenRoutes,
  shopFullScreenRoutes,
} from './tabs'
import { useEnsureHousehold } from '../features/household'

const Tab = createBottomTabNavigator<MainTabParamList>()

/**
 * Routes where the bottom tab bar should be completely hidden.
 *
 * Aggregated from each stack rather than listed here. A hardcoded set in this
 * file is invisible to whoever adds a full-bleed screen three directories
 * away, so declaring it next to the screen keeps the two from drifting.
 */
const TAB_BAR_HIDDEN_ROUTES = new Set<string>([
  ...homeFullScreenRoutes,
  ...recipesFullScreenRoutes,
  ...productsFullScreenRoutes,
  ...householdFullScreenRoutes,
  ...shopFullScreenRoutes,
])

function getTabBarStyle(route: RouteProp<MainTabParamList>) {
  const focusedRoute = getFocusedRouteNameFromRoute(route)
  if (focusedRoute && TAB_BAR_HIDDEN_ROUTES.has(focusedRoute)) {
    return {
      display: 'none' as const,
    }
  }
  return {
    backgroundColor: neutralColors.background.elevated,
    borderTopColor: neutralColors.border.subtle,
    borderTopWidth: 1,
  }
}

/**
 * Tab icon: a 2px teal tick above the glyph marks the active tab.
 */
function TabIcon({
  Icon,
  color,
  size,
  focused,
}: {
  Icon: LucideIcon
  color: string
  size: number
  focused: boolean
}) {
  return (
    <YStack alignItems='center' gap={5}>
      <YStack
        width={24}
        height={2}
        borderRadius={1}
        backgroundColor={focused ? brandColors.primary : 'transparent'}
      />
      <Icon size={size - 2} color={color} />
    </YStack>
  )
}

export default function MainNavigator() {
  useEnsureHousehold()

  return (
    <Tab.Navigator
      // Back from Settings returns to the tab it was opened from.
      backBehavior='history'
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brandColors.primary,
        tabBarInactiveTintColor: neutralColors.text.muted,
        tabBarLabelStyle: {
          fontFamily: fontFaces.medium,
          fontSize: 12,
        },
        tabBarStyle: {
          backgroundColor: neutralColors.background.elevated,
          borderTopColor: neutralColors.border.subtle,
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name='HomeTab'
        component={HomeStack}
        options={({ route }) => ({
          tabBarLabel: 'Meal plan',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              Icon={CalendarDays}
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      <Tab.Screen
        name='RecipesTab'
        component={RecipesStack}
        options={({ route }) => ({
          tabBarLabel: 'Recipes',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              Icon={ChefHat}
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      <Tab.Screen
        name='ProductsTab'
        component={ProductsStack}
        options={({ route }) => ({
          tabBarLabel: 'Products',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              Icon={ShoppingBag}
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      <Tab.Screen
        name='HouseholdTab'
        component={HouseholdStack}
        options={({ route }) => ({
          tabBarLabel: 'Household',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={Users} color={color} size={size} focused={focused} />
          ),
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      <Tab.Screen
        name='ShopTab'
        component={ShopStack}
        options={({ route }) => ({
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              Icon={ShoppingCart}
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      {/* Settings opens from the avatar in the header, not the tab bar. */}
      <Tab.Screen
        name='SettingsTab'
        component={SettingsStack}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  )
}
