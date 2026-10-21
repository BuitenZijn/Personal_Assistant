import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Linking } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  useFonts,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono'
import { DefaultTheme, NavigationContainer } from '@react-navigation/native'
import {
  brandColors,
  config,
  neutralColors,
  TamaguiProvider,
  YStack,
  Spinner,
  Text,
  ToastProvider,
} from '@pa/ui'
import { ConvexProvider, useConvexAuth } from './lib/ConvexProvider'
import AuthNavigator from './navigation/AuthNavigator'
import MainNavigator from './navigation/MainNavigator'
import { MinimumVersionGate } from './features/app-update'
import { ScreenBoundary } from './components/ScreenBoundary'
import { logger } from './lib/logger'
import {
  parsePasswordResetLink,
  type PasswordResetRequest,
} from './lib/auth/reset-password-link'

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: brandColors.primary,
    background: neutralColors.background.page,
    card: neutralColors.background.elevated,
    text: neutralColors.text.primary,
    border: neutralColors.border.default,
  },
}

/**
 * Inner app that can use ConvexAuth context

 */
function AppContent() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [resetRequest, setResetRequest] = useState<PasswordResetRequest | null>(
    null,
  )
  const [resetSession, setResetSession] = useState(0)
  const [isCheckingInitialLink, setIsCheckingInitialLink] = useState(true)

  useEffect(() => {
    let active = true

    const handleUrl = (url: string) => {
      const request = parsePasswordResetLink(url)
      if (request && active) {
        setResetRequest(request)
        setResetSession(current => current + 1)
      }
    }

    void Linking.getInitialURL()
      .then(url => {
        if (url) handleUrl(url)
      })
      .catch(linkError => {
        if (active) {
          logger.warn('App', 'Unable to inspect the initial app link', {
            error: linkError,
          })
        }
      })
      .finally(() => {
        if (active) setIsCheckingInitialLink(false)
      })

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url)
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  if (isLoading || isCheckingInitialLink) {
    return (
      <YStack
        flex={1}
        backgroundColor='$background'
        justifyContent='center'
        alignItems='center'
      >
        <Spinner size='large' />
        <Text marginTop='$4'>Checking authentication...</Text>
      </YStack>
    )
  }

  return (
    <NavigationContainer
      theme={navigationTheme}
      key={resetRequest ? `password-reset-${resetSession}` : 'app'}
    >
      {resetRequest ? (
        <AuthNavigator
          resetRequest={resetRequest}
          onResetComplete={() => setResetRequest(null)}
        />
      ) : isAuthenticated ? (
        <MainNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  )
}

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  // Instrument design system: IBM Plex Mono carries numerals and micro-labels.
  const [fontsLoaded] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  })

  useEffect(() => {
    // Set up logging before the first screen renders
    const init = async () => {
      try {
        // Initialize logger first for crash capture
        await logger.initialize()
        // Intercept console.* calls to capture all logs
        logger.interceptConsole()
      } catch (err) {
        logger.error('App', 'Error initializing', { error: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  if (isLoading || !fontsLoaded) {
    return (
      <TamaguiProvider config={config} defaultTheme='light'>
        <YStack
          flex={1}
          backgroundColor='$background'
          justifyContent='center'
          alignItems='center'
        >
          <Spinner size='large' />
          <Text marginTop='$4'>Loading…</Text>
        </YStack>
        <StatusBar style='dark' />
      </TamaguiProvider>
    )
  }

  if (error) {
    return (
      <TamaguiProvider config={config} defaultTheme='light'>
        <YStack
          flex={1}
          backgroundColor='$background'
          justifyContent='center'
          alignItems='center'
          padding='$4'
        >
          <Text size='$5' weight='bold' variant='error' marginBottom='$4'>
            Error
          </Text>
          <Text textAlign='center' variant='muted'>
            {error}
          </Text>
        </YStack>
        <StatusBar style='dark' />
      </TamaguiProvider>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={config} defaultTheme='light'>
          <ToastProvider>
            <ConvexProvider>
              {/* The navigators give each screen its own boundary; this one
                  catches throws in the gates above them. Inside
                  ConvexProvider so "Try again" keeps the client and auth. */}
              <ScreenBoundary name='App'>
                <MinimumVersionGate>
                  <AppContent />
                </MinimumVersionGate>
              </ScreenBoundary>
            </ConvexProvider>
          </ToastProvider>
          <StatusBar style='dark' />
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default App
