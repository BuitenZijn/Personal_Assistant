import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  ConvexReactClient,
  useConvexAuth as useConvexSessionAuth,
} from 'convex/react'
import { ConvexAuthProvider as BaseConvexAuthProvider } from '@convex-dev/auth/react'
import { logger } from './logger'
import Constants from 'expo-constants'
import { getFunctionName } from 'convex/server'

const CONVEX_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_CONVEX_URL ||
  process.env.EXPO_PUBLIC_CONVEX_URL ||
  'https://your-deployment.convex.cloud'

console.log('[Convex] Connecting to:', CONVEX_URL)

const convexReactClient = new ConvexReactClient(CONVEX_URL)

// ---------------------------------------------------------------------------
// Instrument every Convex query / mutation / action so we can trace calls in
// the debug log without touching call-sites.
// ---------------------------------------------------------------------------
{
  const TAG = 'Convex'
  const SENSITIVE_LOG_FIELD = /password|token|secret|verifier|authorization/i

  function redactSensitiveLogValues(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(redactSensitiveLogValues)
    }
    if (!value || typeof value !== 'object') return value

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        key.toLowerCase() === 'code' || SENSITIVE_LOG_FIELD.test(key)
          ? '[REDACTED]'
          : redactSensitiveLogValues(nested),
      ]),
    )
  }

  const originalQuery = convexReactClient.query.bind(convexReactClient)
  const originalMutation = convexReactClient.mutation.bind(convexReactClient)
  const originalAction = convexReactClient.action.bind(convexReactClient)

  function nameOf(fnRef: any): string {
    try {
      return getFunctionName(fnRef)
    } catch {
      return String(fnRef)
    }
  }

  convexReactClient.query = (async (fnRef: any, args?: any) => {
    const name = nameOf(fnRef)
    const start = performance.now()
    logger.debug(TAG, `Q  ${name}`, redactSensitiveLogValues(args))
    try {
      const result = await originalQuery(fnRef, args)
      logger.debug(
        TAG,
        `Q  ${name} OK (${Math.round(performance.now() - start)}ms)`,
      )
      return result
    } catch (error) {
      logger.warn(
        TAG,
        `Q  ${name} FAIL (${Math.round(performance.now() - start)}ms)`,
        { error },
      )
      throw error
    }
  }) as typeof convexReactClient.query

  convexReactClient.mutation = (async (
    fnRef: any,
    args?: any,
    options?: any,
  ) => {
    const name = nameOf(fnRef)
    const start = performance.now()
    logger.debug(TAG, `M  ${name}`, redactSensitiveLogValues(args))
    try {
      const result = await originalMutation(fnRef, args, options)
      logger.debug(
        TAG,
        `M  ${name} OK (${Math.round(performance.now() - start)}ms)`,
      )
      return result
    } catch (error) {
      logger.warn(
        TAG,
        `M  ${name} FAIL (${Math.round(performance.now() - start)}ms)`,
        { error },
      )
      throw error
    }
  }) as typeof convexReactClient.mutation

  convexReactClient.action = (async (fnRef: any, args?: any) => {
    const name = nameOf(fnRef)
    const start = performance.now()
    logger.debug(TAG, `A  ${name}`, redactSensitiveLogValues(args))
    try {
      const result = await originalAction(fnRef, args)
      logger.debug(
        TAG,
        `A  ${name} OK (${Math.round(performance.now() - start)}ms)`,
      )
      return result
    } catch (error) {
      logger.warn(
        TAG,
        `A  ${name} FAIL (${Math.round(performance.now() - start)}ms)`,
        { error },
      )
      throw error
    }
  }) as typeof convexReactClient.action
}

interface ConvexAuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
}

const ConvexAuthContext = createContext<ConvexAuthContextType>({
  isAuthenticated: false,
  isLoading: true,
})

export const useConvexAuth = () => useContext(ConvexAuthContext)

interface ConvexProviderProps {
  children: ReactNode
}

function ConvexProviderInner({ children }: ConvexProviderProps) {
  const { isAuthenticated, isLoading } = useConvexSessionAuth()

  const contextValue = useMemo<ConvexAuthContextType>(
    () => ({ isAuthenticated, isLoading }),
    [isAuthenticated, isLoading],
  )

  return (
    <ConvexAuthContext.Provider value={contextValue}>
      {children}
    </ConvexAuthContext.Provider>
  )
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  return (
    <BaseConvexAuthProvider
      client={convexReactClient}
      storage={AsyncStorage}
      storageNamespace={CONVEX_URL}
    >
      <ConvexProviderInner>{children}</ConvexProviderInner>
    </BaseConvexAuthProvider>
  )
}
