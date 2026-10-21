import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native'
import {
  YStack,
  XStack,
  Text,
  Button,
  ButtonText,
  LoadingSpinner,
  brandColors,
  neutralColors,
  monoFont,
} from '@pa/ui'
import { BrandHeader } from '../components/BrandHeader'
import { useAuthActions } from '@convex-dev/auth/react'
import { useAction } from 'convex/react'
import { api } from '@pa/backend/api'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../../../navigation/types'
import { useConvexAuth } from '../../../lib/ConvexProvider'
import { convexErrorData } from '../../../lib/convexErrors'
import { ArrowLeft } from 'lucide-react-native'

const CODE_LENGTH = 6

type Props = StackScreenProps<AuthStackParamList, 'CodeVerification'>

export function CodeVerificationScreen({ navigation, route }: Props) {
  // As typed: the backend matches the address whatever its case.
  const email = route.params.email.trim()
  const { signIn } = useAuthActions()
  const resendVerificationCode = useAction(
    api.functions.users.resendVerificationCode,
  )
  const { isAuthenticated } = useConvexAuth()
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  // Navigate away when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setIsVerifying(false)
    }
  }, [isAuthenticated])

  // `handleVerify` is redeclared every render, so the memoised input handlers
  // below would otherwise keep calling whichever instance existed when they
  // were created. The ref is updated on every render, so they always reach the
  // current one without re-memoising on each keystroke.
  const handleVerifyRef = useRef<(code?: string) => void>(() => {})

  const handleDigitChange = useCallback(
    (text: string, index: number) => {
      // Only accept numeric input
      const cleaned = text.replace(/[^0-9]/g, '')

      if (cleaned.length <= 1) {
        const newDigits = [...digits]
        newDigits[index] = cleaned
        setDigits(newDigits)

        // Auto-advance to next input
        if (cleaned.length === 1 && index < CODE_LENGTH - 1) {
          inputRefs.current[index + 1]?.focus()
        }

        // Auto-submit when last digit is entered
        if (cleaned.length === 1 && index === CODE_LENGTH - 1) {
          const code = newDigits.join('')
          if (code.length === CODE_LENGTH) {
            handleVerifyRef.current(code)
          }
        }
      } else if (cleaned.length > 1) {
        // Handle paste: distribute digits across inputs
        const chars = cleaned.slice(0, CODE_LENGTH).split('')
        const newDigits = [...digits]
        chars.forEach((char, i) => {
          if (index + i < CODE_LENGTH) {
            newDigits[index + i] = char
          }
        })
        setDigits(newDigits)

        // Focus the next empty input or the last one
        const nextEmpty = newDigits.findIndex((d, i) => i >= index && d === '')
        const focusIndex =
          nextEmpty >= 0
            ? nextEmpty
            : Math.min(index + chars.length, CODE_LENGTH - 1)
        inputRefs.current[focusIndex]?.focus()

        // Auto-submit if all filled
        const code = newDigits.join('')
        if (code.length === CODE_LENGTH) {
          handleVerifyRef.current(code)
        }
      }
    },
    [digits],
  )

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && digits[index] === '' && index > 0) {
        // Move to previous input on backspace when current is empty
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        setDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      }
    },
    [digits],
  )

  const handleVerify = async (codeOverride?: string) => {
    const code = codeOverride ?? digits.join('')
    if (code.length !== CODE_LENGTH) {
      Alert.alert('Incomplete code', 'Enter all 6 digits.')
      return
    }

    setIsVerifying(true)
    try {
      await signIn('password', {
        flow: 'email-verification',
        code,
        email,
      })
    } catch (error: unknown) {
      const coded = convexErrorData(error)
      const message = error instanceof Error ? error.message : String(error)
      if (coded?.code === 'TOO_MANY_REQUESTS') {
        Alert.alert('Please wait', coded.message ?? 'Too many attempts.')
      } else if (
        coded?.code === 'INVALID_CODE' ||
        message.includes('Invalid') ||
        message.includes('expired')
      ) {
        Alert.alert(
          'Invalid code',
          'This code is invalid or has expired. Request a new one.',
        )
      } else {
        Alert.alert(
          'Confirmation failed',
          coded?.message ??
            'The code could not be checked. Check your connection and try again.',
        )
      }
      setIsVerifying(false)
    }
  }

  handleVerifyRef.current = handleVerify

  const handleResend = async () => {
    setIsResending(true)
    try {
      // Needs no password. Signing in with an empty one (as this used to)
      // never sent a code and counted as a failed sign-in.
      const result = await resendVerificationCode({ email })
      if (result?.status === 'reused') {
        // Past the hourly limit nothing is sent while the last code works.
        Alert.alert(
          'Check your inbox',
          'Your previous code is still valid — check your inbox (and spam).',
        )
      } else {
        // `sent`, or nothing from a backend from before the status.
        Alert.alert('Code sent', `We sent a new verification code to ${email}.`)
      }
      // Clear digits for fresh entry
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } catch (error: unknown) {
      const coded = convexErrorData(error)
      if (coded?.code === 'TOO_MANY_REQUESTS') {
        Alert.alert(
          'Please wait',
          coded.message ?? 'Too many codes were requested. Try again later.',
        )
      } else {
        Alert.alert(
          'Code not sent',
          "We couldn't send a new code. Check your connection and try again.",
        )
      }
    } finally {
      setIsResending(false)
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
            <BrandHeader compact subtitle='Confirm your email address' />
            <Text size='$3' variant='subtle' textAlign='center' maxWidth={300}>
              Enter the 6-digit code we sent to
            </Text>
            <Text size='$3' weight='bold' textAlign='center'>
              {email}
            </Text>
          </YStack>

          <YStack gap='$4' marginTop='$4' alignItems='center'>
            <XStack gap='$2' justifyContent='center'>
              {digits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => {
                    inputRefs.current[index] = ref
                  }}
                  style={{
                    width: 48,
                    height: 56,
                    borderWidth: 1,
                    borderColor: digit
                      ? brandColors.primary
                      : neutralColors.border.default,
                    borderRadius: 10,
                    textAlign: 'center',
                    fontSize: 24,
                    fontWeight: '600',
                    fontFamily: monoFont.semibold,
                    backgroundColor: 'transparent',
                    color: neutralColors.text.primary,
                  }}
                  selectionColor={brandColors.primary}
                  value={digit}
                  onChangeText={text => handleDigitChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType='number-pad'
                  maxLength={CODE_LENGTH}
                  selectTextOnFocus
                  accessibilityLabel={`Digit ${index + 1} of ${CODE_LENGTH}`}
                />
              ))}
            </XStack>

            <Button
              size='$5'
              onPress={() => handleVerify()}
              disabled={isVerifying || digits.join('').length !== CODE_LENGTH}
              accessibilityRole='button'
              accessibilityLabel='Confirm code'
              width='100%'
            >
              {isVerifying ? (
                <LoadingSpinner />
              ) : (
                <ButtonText variant='cta'>Bevestigen</ButtonText>
              )}
            </Button>

            <YStack gap='$2' alignItems='center' paddingTop='$2'>
              <Text size='$3' variant='subtle' textAlign='center'>
                Didn’t get a code?
              </Text>
              <Button
                size='$3'
                variant='secondary'
                onPress={handleResend}
                disabled={isResending || isVerifying}
                accessibilityRole='button'
                accessibilityLabel='Send a new verification code'
              >
                <ButtonText variant='secondary'>
                  {isResending ? 'Sending…' : 'Send a new code'}
                </ButtonText>
              </Button>
            </YStack>

            <Button
              size='$3'
              variant='secondary'
              onPress={() => navigation.goBack()}
              disabled={isVerifying}
              marginTop='$2'
              accessibilityRole='button'
              accessibilityLabel='Back'
            >
              <ArrowLeft size={16} color={neutralColors.text.muted} />
              <ButtonText variant='secondary'>Terug</ButtonText>
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
