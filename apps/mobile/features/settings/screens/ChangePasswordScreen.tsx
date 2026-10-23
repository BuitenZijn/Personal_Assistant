import React, { useState } from 'react'
import { Alert } from 'react-native'
import {
  YStack,
  Text,
  Button,
  ButtonText,
  Card,
  MonoText,
  neutralColors,
  cardColors,
  Spinner,
} from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import { useAuthActions } from '@convex-dev/auth/react'
import { useCurrentUser } from '../../../lib/useCurrentUser'
import { convexErrorData } from '../../../lib/convexErrors'
import { Mail, KeyRound } from 'lucide-react-native'
import { AppShell, ScreenHeader } from '../../../components/shell'

/**
 * ChangePasswordScreen - Request a password reset email
 *
 * Since we use @convex-dev/auth with email-based reset flow,
 * the user gets a reset link sent to their email address.
 */
export function ChangePasswordScreen() {
  const navigation = useNavigation()
  const { signIn } = useAuthActions()
  const { user } = useCurrentUser()

  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  const email = user?.email

  const handleRequestReset = async () => {
    if (!email) {
      Alert.alert('Error', 'There is no email address on your account.')
      return
    }

    setIsSending(true)
    try {
      await signIn('password', {
        flow: 'reset',
        email,
        redirectTo: `personalassistant://reset-password?email=${encodeURIComponent(email)}`,
      })
      setSent(true)
    } catch (error) {
      const coded = convexErrorData(error)
      if (coded?.code === 'TOO_MANY_REQUESTS') {
        // A link went out moments ago: that one works.
        Alert.alert(
          'Please wait',
          coded.message ??
            'A reset link was just sent to your email. Try again in a minute.',
        )
      } else {
        console.error('Error requesting password reset:', error)
        Alert.alert(
          'Fout',
          'The reset email could not be sent. Try again later.',
        )
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AppShell showHeader={false}>
      <ScreenHeader title='Change password' />
      <YStack flex={1} padding='$4' gap='$4'>
        <Card padding='$4' variant='outlined' borderRadius={10}>
          <YStack gap='$4' alignItems='center'>
            <YStack
              width={56}
              height={56}
              borderRadius={12}
              backgroundColor={cardColors.border}
              alignItems='center'
              justifyContent='center'
            >
              <KeyRound size={28} color={cardColors.text} />
            </YStack>

            {sent ? (
              <YStack gap='$3' alignItems='center'>
                <Text size='$5' weight='semibold' textAlign='center'>
                  Check your email
                </Text>
                <Text
                  size='$4'
                  variant='muted'
                  textAlign='center'
                  paddingHorizontal='$2'
                >
                  We sent a reset link to{' '}
                  <Text size='$4' weight='semibold'>
                    {email}
                  </Text>
                  . Open it on your phone, where the app is, to choose a new
                  password.
                </Text>
              </YStack>
            ) : (
              <YStack gap='$3' alignItems='center'>
                <Text size='$5' weight='semibold' textAlign='center'>
                  Reset your password
                </Text>
                <Text
                  size='$4'
                  variant='muted'
                  textAlign='center'
                  paddingHorizontal='$2'
                >
                  We’ll send a link to your email address to reset your
                  password.
                </Text>
                {email && (
                  <Card
                    padding='$3'
                    variant='outlined'
                    borderRadius={10}
                    width='100%'
                  >
                    <YStack gap='$1' alignItems='center'>
                      <Mail size={16} color={cardColors.textMuted} />
                      <MonoText size='$3' weight='medium'>
                        {email}
                      </MonoText>
                    </YStack>
                  </Card>
                )}
              </YStack>
            )}
          </YStack>
        </Card>

        {sent ? (
          <Button
            variant='outline'
            size='$5'
            onPress={() => navigation.goBack()}
          >
            <ButtonText variant='secondary'>Back to settings</ButtonText>
          </Button>
        ) : (
          <Button
            variant='primary'
            size='$5'
            onPress={handleRequestReset}
            disabled={isSending || !email}
            opacity={isSending || !email ? 0.6 : 1}
            icon={
              isSending ? (
                <Spinner size='small' color={neutralColors.background.page} />
              ) : (
                <Mail size={20} color={neutralColors.background.page} />
              )
            }
          >
            <ButtonText variant='cta'>
              {isSending ? 'Sending…' : 'Send reset link'}
            </ButtonText>
          </Button>
        )}
      </YStack>
    </AppShell>
  )
}

export default ChangePasswordScreen
