import React, { useRef, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import type { TamaguiTextElement } from '@pa/ui'
import {
  Button,
  ButtonText,
  Card,
  InfoCard,
  LoadingSpinner,
  MicroLabel,
  StyledInput,
  Text,
  XStack,
  YStack,
  brandColors,
  neutralColors,
  cardColors,
  semanticColors,
} from '@pa/ui'
import { useAuthActions } from '@convex-dev/auth/react'
import type { StackScreenProps } from '@react-navigation/stack'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
} from 'lucide-react-native'
import type { AuthStackParamList } from '../../../navigation/types'

type ScreenProps = StackScreenProps<AuthStackParamList, 'ResetPassword'>

interface Props extends ScreenProps {
  onComplete: () => void
}

export function ResetPasswordScreen({ route, onComplete }: Props) {
  const { code, email, preview } = route.params
  const { signIn } = useAuthActions()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(preview === 'success')
  const confirmPasswordRef = useRef<TamaguiTextElement>(null)

  const hasMinimumLength = newPassword.length >= 8
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword
  const canSubmit = hasMinimumLength && passwordsMatch && !isSubmitting

  const handleReset = async () => {
    if (!hasMinimumLength) {
      setError('Use at least 8 characters for your new password.')
      return
    }
    if (!passwordsMatch) {
      setError("The passwords don't match yet.")
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await signIn('password', {
        flow: 'reset-verification',
        email,
        code,
        newPassword,
      })
      Keyboard.dismiss()
      setCompleted(true)
    } catch (resetError: unknown) {
      const message =
        resetError instanceof Error ? resetError.message : String(resetError)
      setError(
        message.includes('Invalid') || message.toLowerCase().includes('expired')
          ? 'This reset link is invalid or has expired. Request a new one from the sign-in screen.'
          : 'Your password could not be reset. Check your connection and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        contentInsetAdjustmentBehavior='automatic'
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='interactive'
        bounces={false}
      >
        <YStack
          flex={1}
          backgroundColor='$background'
          padding='$4'
          justifyContent='center'
          gap='$6'
        >
          <YStack gap='$3' alignItems='center'>
            <YStack
              width={64}
              height={64}
              borderRadius={32}
              borderWidth={1}
              borderColor={
                completed
                  ? semanticColors.success.border
                  : neutralColors.border.default
              }
              alignItems='center'
              justifyContent='center'
            >
              {completed ? (
                <CheckCircle2 size={28} color={semanticColors.success.main} />
              ) : (
                <KeyRound size={28} color={brandColors.primary} />
              )}
            </YStack>
            <Text weight='bold' size='$8' textAlign='center' selectable>
              {completed ? 'Password changed' : 'Choose a new password'}
            </Text>
            <Text
              size='$4'
              variant='muted'
              textAlign='center'
              maxWidth={330}
              selectable
            >
              {completed
                ? 'Your account is secure and ready to use.'
                : "Choose a password you don't use anywhere else."}
            </Text>
          </YStack>

          {completed ? (
            <YStack gap='$4'>
              <InfoCard variant='success' size='$4'>
                <XStack gap='$3' alignItems='center'>
                  <CheckCircle2 size={22} color={semanticColors.success.main} />
                  <Text flex={1} size='$3' variant='success' selectable>
                    Your password has been changed. You’ve been signed out on
                    your other devices to protect your account.
                  </Text>
                </XStack>
              </InfoCard>
              <Button
                size='$5'
                onPress={onComplete}
                accessibilityLabel='Continue to Personal Assistant'
              >
                <ButtonText variant='cta'>
                  Continue to Personal Assistant
                </ButtonText>
              </Button>
            </YStack>
          ) : (
            <YStack gap='$4'>
              <Card variant='outlined' size='$3'>
                <XStack gap='$2' alignItems='center'>
                  <Mail size={16} color={cardColors.textMuted} />
                  <Text size='$2' variant='muted' flex={1} selectable>
                    New password for {email}
                  </Text>
                </XStack>
              </Card>

              <YStack gap='$3'>
                <YStack gap='$2'>
                  <MicroLabel>New password</MicroLabel>
                  <YStack position='relative'>
                    <StyledInput
                      id='new-password'
                      size='$5'
                      value={newPassword}
                      onChangeText={value => {
                        setNewPassword(value)
                        setError(null)
                      }}
                      placeholder='At least 8 characters'
                      secureTextEntry={!showNewPassword}
                      autoCapitalize='none'
                      autoCorrect={false}
                      autoComplete='new-password'
                      returnKeyType='next'
                      blurOnSubmit={false}
                      onSubmitEditing={() =>
                        confirmPasswordRef.current?.focus()
                      }
                      accessibilityLabel='New password'
                      paddingRight='$8'
                    />
                    <YStack
                      position='absolute'
                      right={12}
                      top={0}
                      bottom={0}
                      justifyContent='center'
                      onPress={() => setShowNewPassword(value => !value)}
                      pressStyle={{ opacity: 0.7 }}
                      accessibilityRole='button'
                      accessibilityLabel={
                        showNewPassword
                          ? 'Hide new password'
                          : 'Show new password'
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff size={20} color={neutralColors.text.muted} />
                      ) : (
                        <Eye size={20} color={neutralColors.text.muted} />
                      )}
                    </YStack>
                  </YStack>
                </YStack>

                <YStack gap='$2'>
                  <MicroLabel>Confirm password</MicroLabel>
                  <YStack position='relative'>
                    <StyledInput
                      id='confirm-new-password'
                      ref={confirmPasswordRef}
                      size='$5'
                      value={confirmPassword}
                      onChangeText={value => {
                        setConfirmPassword(value)
                        setError(null)
                      }}
                      placeholder='Enter it again'
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize='none'
                      autoCorrect={false}
                      autoComplete='new-password'
                      returnKeyType='done'
                      onSubmitEditing={handleReset}
                      accessibilityLabel='Confirm new password'
                      paddingRight='$8'
                    />
                    <YStack
                      position='absolute'
                      right={12}
                      top={0}
                      bottom={0}
                      justifyContent='center'
                      onPress={() => setShowConfirmPassword(value => !value)}
                      pressStyle={{ opacity: 0.7 }}
                      accessibilityRole='button'
                      accessibilityLabel={
                        showConfirmPassword
                          ? 'Hide confirmed password'
                          : 'Show confirmed password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color={neutralColors.text.muted} />
                      ) : (
                        <Eye size={20} color={neutralColors.text.muted} />
                      )}
                    </YStack>
                  </YStack>
                </YStack>
              </YStack>

              <YStack gap='$2'>
                <XStack gap='$2' alignItems='center'>
                  <Check
                    size={15}
                    color={
                      hasMinimumLength
                        ? semanticColors.success.main
                        : neutralColors.text.muted
                    }
                  />
                  <Text
                    size='$2'
                    variant={hasMinimumLength ? 'success' : 'subtle'}
                  >
                    At least 8 characters
                  </Text>
                </XStack>
                <XStack gap='$2' alignItems='center'>
                  <Check
                    size={15}
                    color={
                      passwordsMatch
                        ? semanticColors.success.main
                        : neutralColors.text.muted
                    }
                  />
                  <Text
                    size='$2'
                    variant={passwordsMatch ? 'success' : 'subtle'}
                  >
                    Passwords match
                  </Text>
                </XStack>
              </YStack>

              {error && (
                <InfoCard
                  variant='error'
                  size='$3'
                  accessibilityRole='alert'
                  accessibilityLiveRegion='polite'
                >
                  <XStack gap='$2' alignItems='flex-start'>
                    <AlertCircle size={17} color={semanticColors.error.main} />
                    <Text flex={1} size='$2' variant='error' selectable>
                      {error}
                    </Text>
                  </XStack>
                </InfoCard>
              )}

              <Button
                size='$5'
                onPress={handleReset}
                disabled={!canSubmit}
                accessibilityLabel='Change password'
              >
                {isSubmitting ? (
                  <LoadingSpinner size='$3' />
                ) : (
                  <ButtonText variant='cta'>Change password</ButtonText>
                )}
              </Button>

              <Button variant='ghost' onPress={onComplete}>
                <ButtonText variant='muted'>Annuleren</ButtonText>
              </Button>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
