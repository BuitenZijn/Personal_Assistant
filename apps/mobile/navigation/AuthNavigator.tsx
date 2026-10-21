import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { screenBoundaryLayout } from '../components/ScreenBoundary'
import type { AuthStackParamList } from './types'
import {
  SignInScreen,
  SignUpScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  CodeVerificationScreen,
} from '../features/auth'
import type { PasswordResetRequest } from '../lib/auth/reset-password-link'

const Stack = createStackNavigator<AuthStackParamList>()

interface AuthNavigatorProps {
  resetRequest?: PasswordResetRequest | null
  onResetComplete?: () => void
}

export default function AuthNavigator({
  resetRequest,
  onResetComplete = () => {},
}: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={resetRequest ? 'ResetPassword' : undefined}
      screenOptions={{ headerShown: false }}
      screenLayout={screenBoundaryLayout('Auth')}
    >
      <Stack.Screen name='SignIn' component={SignInScreen} />
      <Stack.Screen name='SignUp' component={SignUpScreen} />
      <Stack.Screen name='ForgotPassword' component={ForgotPasswordScreen} />
      <Stack.Screen
        name='CodeVerification'
        component={CodeVerificationScreen}
      />
      <Stack.Screen
        name='ResetPassword'
        initialParams={resetRequest ?? undefined}
      >
        {screenProps => (
          <ResetPasswordScreen {...screenProps} onComplete={onResetComplete} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  )
}
