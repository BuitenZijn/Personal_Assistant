import type { StackNavigationOptions } from '@react-navigation/stack'

/**
 * Screen options shared by every stack in the app.
 *
 * Each stack used to spell these out, and they had already drifted — HomeStack
 * was missing `gestureEnabled`, so swipe-back silently did not work there.
 */
export const defaultScreenOptions: StackNavigationOptions = {
  headerShown: false,
  gestureEnabled: true,
}
