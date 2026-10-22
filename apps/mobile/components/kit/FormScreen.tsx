import React from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import {
  Button,
  ButtonText,
  MicroLabel,
  Spinner,
  Text,
  YStack,
  neutralColors,
} from '@pa/ui'
import { Check } from 'lucide-react-native'
import { AppShell, ScreenHeader } from '../shell'

/** A pushed form screen: header, scrolling fields, keyboard handling. */
export function FormScreen({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <AppShell showHeader={false}>
      <ScreenHeader title={title} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 16 }}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  )
}

/** A label above a control, with an optional hint below it. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <YStack gap='$2'>
      <MicroLabel>{label}</MicroLabel>
      {children}
      {hint ? (
        <Text size='$2' variant='muted'>
          {hint}
        </Text>
      ) : null}
    </YStack>
  )
}

/** The screen's one primary button. */
export function SaveButton({
  label,
  busyLabel,
  busy,
  disabled,
  onPress,
}: {
  label: string
  busyLabel: string
  busy: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Button
      variant='primary'
      size='$5'
      onPress={onPress}
      disabled={busy || disabled}
      icon={
        busy ? (
          <Spinner size='small' color={neutralColors.background.page} />
        ) : (
          <Check size={20} color={neutralColors.background.page} />
        )
      }
    >
      <ButtonText variant='cta'>{busy ? busyLabel : label}</ButtonText>
    </Button>
  )
}
