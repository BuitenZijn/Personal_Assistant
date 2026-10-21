import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import {
  YStack,
  Text,
  Button,
  ButtonText,
  StyledInput,
  MicroLabel,
  Card,
  brandColors,
  neutralColors,
  cardColors,
  Spinner,
  LinkText,
} from '@pa/ui'
import { useAuthActions } from '@convex-dev/auth/react'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../../../navigation/types'
import { convexErrorData } from '../../../lib/convexErrors'
import { KeyRound, Mail } from 'lucide-react-native'

type Props = StackScreenProps<AuthStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen({ navigation }: Props) {
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleRequestReset = async () => {
    // As typed: the backend matches the address whatever its case.
    const trimmed = email.trim()
    if (!trimmed) {
      Alert.alert('Email address missing', 'Enter your email address.')
      return
    }

    setIsSending(true)
    try {
      await signIn('password', {
        flow: 'reset',
        email: trimmed,
        redirectTo: `personalassistant://reset-password?email=${encodeURIComponent(trimmed)}`,
      })
      setSent(true)
    } catch (error: unknown) {
      const coded = convexErrorData(error)
      const message = error instanceof Error ? error.message : String(error)
      if (coded?.code === 'TOO_MANY_REQUESTS') {
        // A link went out moments ago: nothing was sent now.
        Alert.alert(
          'Please wait',
          coded.message ??
            'A reset link was just sent to this address. Try again in a minute.',
        )
      } else if (!coded && /connection lost|network/i.test(message)) {
        Alert.alert(
          'No connection',
          "We couldn't reach Personal Assistant. Check your connection and try again.",
        )
      } else {
        // Anything else (a failed send, say) would only happen for an
        // existing account; showing it would give that away.
        setSent(true)
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps='handled'
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
            {/* Hairline tile, not a tinted disc */}
            <YStack
              width={64}
              height={64}
              borderRadius={32}
              borderWidth={1}
              borderColor={neutralColors.border.default}
              alignItems='center'
              justifyContent='center'
            >
              <KeyRound size={28} color={brandColors.primary} />
            </YStack>
            <Text weight='bold' size='$8' textAlign='center'>
              Reset your password
            </Text>
            <Text size='$5' variant='muted' textAlign='center' maxWidth={320}>
              {sent
                ? 'Check your email'
                : 'Enter your email address to get a reset link'}
            </Text>
          </YStack>

          {sent ? (
            <YStack gap='$4'>
              <Card padding='$4' variant='outlined' borderRadius={10}>
                <YStack gap='$3' alignItems='center'>
                  <Mail size={24} color={cardColors.text} />
                  <Text
                    size='$4'
                    variant='muted'
                    textAlign='center'
                    paddingHorizontal='$2'
                  >
                    If an account exists for{' '}
                    <Text size='$4' weight='semibold'>
                      {email.trim()}
                    </Text>
                    , we sent a link to reset your password. Open it on this
                    phone to choose a new password.
                  </Text>
                </YStack>
              </Card>

              <Button size='$5' onPress={() => navigation.navigate('SignIn')}>
                <ButtonText variant='cta'>Back to sign in</ButtonText>
              </Button>
            </YStack>
          ) : (
            <YStack gap='$3'>
              <YStack gap='$2'>
                <MicroLabel accessibilityLabel='Email address'>
                  Email address
                </MicroLabel>
                <StyledInput
                  id='reset-email'
                  size='$5'
                  value={email}
                  onChangeText={setEmail}
                  placeholder='you@example.com'
                  autoCapitalize='none'
                  keyboardType='email-address'
                  returnKeyType='go'
                  onSubmitEditing={handleRequestReset}
                  accessibilityLabel='Email address'
                />
              </YStack>

              <Button
                size='$5'
                onPress={handleRequestReset}
                marginTop='$2'
                disabled={isSending}
                icon={
                  isSending ? (
                    <Spinner
                      size='small'
                      color={neutralColors.background.page}
                    />
                  ) : undefined
                }
                accessibilityRole='button'
                accessibilityLabel='Send reset link'
              >
                <ButtonText variant='cta'>
                  {isSending ? 'Sending…' : 'Send reset link'}
                </ButtonText>
              </Button>

              <LinkText
                textAlign='center'
                paddingTop='$2'
                onPress={() => navigation.goBack()}
                accessibilityRole='button'
              >
                Back to sign in
              </LinkText>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
