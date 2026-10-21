import React, { useRef, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
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
  XStack,
  neutralColors,
} from '@pa/ui'
import { useAuthActions } from '@convex-dev/auth/react'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../../../navigation/types'
import { convexErrorData } from '../../../lib/convexErrors'
import { Eye, EyeOff } from 'lucide-react-native'

type Props = StackScreenProps<AuthStackParamList, 'SignUp'>

export function SignUpScreen({ navigation }: Props) {
  const { signIn } = useAuthActions()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const lastNameRef = useRef<TamaguiTextElement>(null)
  const emailRef = useRef<TamaguiTextElement>(null)
  const passwordRef = useRef<TamaguiTextElement>(null)
  const confirmPasswordRef = useRef<TamaguiTextElement>(null)

  const handleSignUp = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('Missing details', 'Fill in all fields.')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords differ', "The passwords don't match.")
      return
    }

    setIsSubmitting(true)
    // As typed: the backend matches the address whatever its case.
    const typedEmail = email.trim()
    try {
      const result = await signIn('password', {
        flow: 'signUp',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: typedEmail,
        password,
      })

      if (result.signingIn) {
        // Some configs may sign in immediately.
        return
      }

      setIsSubmitting(false)
      // Navigate to code verification screen
      navigation.navigate('CodeVerification', { email: typedEmail })
    } catch (error: unknown) {
      const coded = convexErrorData(error)
      const message = error instanceof Error ? error.message : String(error)
      if (
        coded?.code === 'INVALID_PASSWORD' ||
        (!coded?.code && message.includes('Invalid password'))
      ) {
        Alert.alert(
          'Sign-up failed',
          'Your password must be at least 8 characters long.',
        )
      } else if (
        coded?.code === 'EMAIL_IN_USE' ||
        (!coded?.code &&
          (message.includes('already exists') ||
            message.includes('already registered')))
      ) {
        // Refused whatever the password: offer to sign in instead.
        Alert.alert(
          'Already registered',
          'This email address is already registered. Sign in, or reset your password if you forgot it.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign in', onPress: () => navigation.navigate('SignIn') },
          ],
        )
      } else {
        Alert.alert(
          'Sign-up failed',
          coded?.message ||
            'Your account could not be created. Check your connection and try again.',
        )
      }
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
          <BrandHeader compact subtitle='Create account' />

          <YStack gap='$3' marginTop='$6'>
            <XStack gap='$2'>
              <YStack gap='$2' flex={1}>
                <MicroLabel accessibilityLabel='First name'>
                  First name
                </MicroLabel>
                <StyledInput
                  id='firstName'
                  size='$5'
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder='Jan'
                  returnKeyType='next'
                  blurOnSubmit={false}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  accessibilityLabel='First name'
                />
              </YStack>

              <YStack gap='$2' flex={1}>
                <MicroLabel accessibilityLabel='Last name'>
                  Last name
                </MicroLabel>
                <StyledInput
                  id='lastName'
                  ref={lastNameRef}
                  size='$5'
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder='Peeters'
                  returnKeyType='next'
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  accessibilityLabel='Last name'
                />
              </YStack>
            </XStack>

            <YStack gap='$2'>
              <MicroLabel accessibilityLabel='Email address'>
                Email address
              </MicroLabel>
              <StyledInput
                id='email'
                ref={emailRef}
                size='$5'
                value={email}
                onChangeText={setEmail}
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
                  onChangeText={setPassword}
                  placeholder='Choose a password'
                  secureTextEntry={!showPassword}
                  autoCapitalize='none'
                  returnKeyType='next'
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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
              <Text size='$1' variant='subtle'>
                At least 8 characters
              </Text>
            </YStack>

            <YStack gap='$2'>
              <MicroLabel accessibilityLabel='Confirm password'>
                Confirm password
              </MicroLabel>
              <YStack position='relative'>
                <StyledInput
                  id='confirmPassword'
                  ref={confirmPasswordRef}
                  size='$5'
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder='Confirm your password'
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize='none'
                  returnKeyType='go'
                  onSubmitEditing={handleSignUp}
                  accessibilityLabel='Confirm password'
                  paddingRight='$8'
                />
                <YStack
                  position='absolute'
                  right={12}
                  top={0}
                  bottom={0}
                  justifyContent='center'
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  pressStyle={{ opacity: 0.7 }}
                  accessibilityRole='button'
                  accessibilityLabel={
                    showConfirmPassword ? 'Hide password' : 'Show password'
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

            <Button
              size='$5'
              onPress={handleSignUp}
              marginTop='$2'
              disabled={isSubmitting}
              accessibilityRole='button'
              accessibilityLabel='Create account'
            >
              {isSubmitting ? (
                <LoadingSpinner />
              ) : (
                <ButtonText variant='cta'>Create account</ButtonText>
              )}
            </Button>

            <AuthDivider label='Already registered?' />

            <Button
              size='$4'
              variant='secondary'
              onPress={() => navigation.navigate('SignIn')}
              disabled={isSubmitting}
              accessibilityRole='button'
              accessibilityLabel='Back to sign in'
            >
              <ButtonText variant='secondary'>Back to sign in</ButtonText>
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
