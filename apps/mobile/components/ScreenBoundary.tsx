import React from 'react'
import { Button, Text, YStack, neutralColors } from '@pa/ui'
import { AlertTriangle } from 'lucide-react-native'
import { logger } from '../lib/logger'

interface ScreenBoundaryProps {
  children: React.ReactNode
  /** Optional label used in logs to identify which area failed. */
  name?: string
}

interface ScreenBoundaryState {
  error: Error | null
}

/**
 * Catches render errors from a screen and shows a recoverable fallback.
 *
 * Without this, a throw anywhere in the tree unmounts the whole app and the
 * player sees a white screen — mid-quest, with an attempt in progress. React
 * only surfaces render errors to a class component, so this stays a class.
 *
 * Wired once per navigator through React Navigation's `screenLayout`, which
 * wraps every screen in that navigator, so the failure is contained to the
 * screen that threw and the rest of the app (tab bar, gameplay state, sync
 * queue) keeps running.
 */
export class ScreenBoundary extends React.Component<
  ScreenBoundaryProps,
  ScreenBoundaryState
> {
  state: ScreenBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ScreenBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('ScreenBoundary', 'Screen crashed', {
      name: this.props.name,
      error: error.message,
      componentStack: info.componentStack,
    })
  }

  private handleRetry = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <YStack
        flex={1}
        alignItems='center'
        justifyContent='center'
        padding='$6'
        gap='$4'
        backgroundColor={neutralColors.background.page}
      >
        <AlertTriangle size={48} color={neutralColors.text.muted} />
        <Text size='$6' weight='bold' textAlign='center'>
          Something went wrong
        </Text>
        <Text variant='muted' textAlign='center'>
          This screen got stuck. Your data is safe.
        </Text>
        <Button variant='primary' onPress={this.handleRetry}>
          Try again
        </Button>
      </YStack>
    )
  }
}

/**
 * `screenLayout` handler that wraps every screen of a navigator in a boundary.
 *
 * @example
 * <Stack.Navigator screenLayout={screenBoundaryLayout('Quests')}>
 */
export function screenBoundaryLayout(name: string) {
  const Layout = ({ children }: { children: React.ReactNode }) => (
    <ScreenBoundary name={name}>{children}</ScreenBoundary>
  )
  Layout.displayName = `ScreenBoundaryLayout(${name})`
  return Layout
}
