import type { StackScreenProps } from '@react-navigation/stack'
import type { NavigatorScreenParams } from '@react-navigation/native'

/**
 * Auth Stack - screens for unauthenticated users
 */
export type AuthStackParamList = {
  SignIn: undefined
  SignUp: undefined
  ForgotPassword: undefined
  ResetPassword: {
    code: string
    email: string
    preview?: 'form' | 'success'
  }
  CodeVerification: { email: string }
}

// ─── Per-tab stack param lists ───────────────────────────────────────────────

export type HomeStackParamList = {
  Home: undefined
}

export type SettingsStackParamList = {
  Settings: undefined
  EditName: undefined
  ChangePassword: undefined
  ProfilePicture: undefined
  AccountPrivacy: undefined
}

// ─── Tab navigator ──────────────────────────────────────────────────────────

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>
}

// ─── Backward-compatible union of all screens ───────────────────────────────
// Screens use this so `navigate('AnyScreen')` type-checks even for cross-tab
// navigation (React Navigation traverses the hierarchy at runtime).

export type MainStackParamList = HomeStackParamList & SettingsStackParamList

/**
 * Root Stack - top level navigation
 */
export type RootStackParamList = {
  Auth: undefined
  Main: undefined
}

// Screen props helpers
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  StackScreenProps<AuthStackParamList, T>
export type MainScreenProps<T extends keyof MainStackParamList> =
  StackScreenProps<MainStackParamList, T>
