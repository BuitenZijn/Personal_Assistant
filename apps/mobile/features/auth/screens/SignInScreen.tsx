import React, { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import type { TamaguiTextElement } from '@pa/ui'
import { BrandHeader, AuthDivider } from '../components/BrandHeader'
import {
  YStack,
  Text,
  Button,
  ButtonText,
  StyledInput,
  MicroLabel,
  LoadingSpinner,
  LinkText,
  neutralColors,
  semanticColors,
  InfoCard,
} from '@pa/ui'
import { useAuthActions } from '@convex-dev/auth/react'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../../../navigation/types'
import { useConvexAuth } from '../../../lib/ConvexProvider'
import { convexErrorData } from '../../../lib/convexErrors'
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native'

type Props = StackScreenProps<AuthStackParamList, 'SignIn'>

export function SignInScreen({ navigation }: Props) {
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const passwordRef = useRef<TamaguiTextElement>(null)

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setSignInError('Enter your email address and password to continue.')
      return
    }

    setSignInError(null)
    setIsSubmitting(true)
    // As typed: the backend matches the address whatever its case.
    const typedEmail = email.trim()
    try {
      const result = await signIn('password', {
        flow: 'signIn',
        email: typedEmail,
        password,
      })

      if (!result.signingIn) {
        // User's email is not yet verified — redirect to code verification
        setIsSubmitting(false)
        navigation.navigate('CodeVerification', { email: typedEmail })
      }
    } catch (error: unknown) {
      const coded = convexErrorData(error)
      const message = error instanceof Error ? error.message : String(error)
      const isConnectionError =
        /network|fetch|offline|connection|timed?\s*out/i.test(message)
      setSignInError(
        coded?.code === 'TOO_MANY_REQUESTS' && coded.message
          ? coded.message
          : isConnectionError
            ? "We couldn't reach Personal Assistant. Check your connection and try again."
            : 'The email address or password is incorrect. Try again or reset your password.',
      )
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      setIsSubmitting(false)
    }
  }, [isAuthenticated])

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
          <BrandHeader />

          <YStack gap='$3' marginTop='$6'>
            <YStack gap='$2'>
              <MicroLabel accessibilityLabel='Email address'>
                Email address
              </MicroLabel>
              <StyledInput
                id='email'
                size='$5'
                value={email}
                onChangeText={value => {
                  setEmail(value)
                  setSignInError(null)
                }}
                placeholder='you@example.com'
                autoCapitalize='none'
                keyboardType='email-address'
                returnKeyType='next'
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                accessibilityLabel='Email address'
              />
            </YStack>

            <YStack gap='$2'>
              <MicroLabel accessibilityLabel='Password'>Password</MicroLabel>
              <YStack position='relative'>
                <StyledInput
                  id='password'
                  ref={passwordRef}
                  size='$5'
                  value={password}
                  onChangeText={value => {
                    setPassword(value)
                    setSignInError(null)
                  }}
                  placeholder='Enter your password'
                  secureTextEntry={!showPassword}
                  autoCapitalize='none'
                  returnKeyType='go'
                  onSubmitEditing={handleSignIn}
                  accessibilityLabel='Password'
                  paddingRight='$8'
                />
                <YStack
                  position='absolute'
                  right={12}
                  top={0}
                  bottom={0}
                  justifyContent='center'
                  onPress={() => setShowPassword(!showPassword)}
                  pressStyle={{ opacity: 0.7 }}
                  accessibilityRole='button'
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={20} color={neutralColors.text.muted} />
                  ) : (
                    <Eye size={20} color={neutralColors.text.muted} />
                  )}
                </YStack>
              </YStack>
            </YStack>

            {signInError && (
              <InfoCard
                variant='error'
                size='$3'
                accessibilityRole='alert'
                accessibilityLiveRegion='polite'
              >
                <YStack gap='$1'>
                  <YStack flexDirection='row' alignItems='center' gap='$2'>
                    <AlertCircle size={17} color={semanticColors.error.main} />
                    <Text
                      size='$3'
                      weight='semibold'
                      variant='error'
                      selectable
                    >
                      Check your details
                    </Text>
                  </YStack>
                  <Text size='$2' variant='error' selectable>
                    {signInError}
                  </Text>
                </YStack>
              </InfoCard>
            )}

            <Button
              size='$5'
              onPress={handleSignIn}
              marginTop='$2'
              disabled={isSubmitting}
              accessibilityRole='button'
              accessibilityLabel='Sign in'
            >
              {isSubmitting ? (
                <LoadingSpinner />
              ) : (
                <ButtonText variant='cta'>Sign in</ButtonText>
              )}
            </Button>

            <LinkText
              textAlign='center'
              onPress={() => navigation.navigate('ForgotPassword')}
              accessibilityRole='button'
            >
              Forgot your password?
            </LinkText>

            <AuthDivider label='New here?' />

            <Button
              size='$4'
              variant='secondary'
              onPress={() => navigation.navigate('SignUp')}
              disabled={isSubmitting}
              accessibilityRole='button'
              accessibilityLabel='Create a new account'
            >
              <ButtonText variant='secondary'>Create account</ButtonText>
            </Button>

            <Text size='$2' variant='subtle' textAlign='center' paddingTop='$2'>
              Sign in to continue on this phone
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
