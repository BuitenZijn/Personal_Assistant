/**
 * Sign-in, sign-up and "forgot password" send the address as typed (the
 * backend matches it whatever its case), sign-up offers to sign in when the
 * address is registered already, and a throttled reset request says to wait
 * instead of claiming a link was sent.
 */
import React from 'react'
import { Alert } from 'react-native'
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native'
import { ConvexError } from 'convex/values'
import { SignInScreen } from '../screens/SignInScreen'
import { SignUpScreen } from '../screens/SignUpScreen'
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen'

const mockSignIn = jest.fn()

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}))

jest.mock('../../../lib/ConvexProvider', () => ({
  useConvexAuth: () => ({ isAuthenticated: false }),
}))

jest.mock('../components/BrandHeader', () => ({
  BrandHeader: () => null,
  AuthDivider: () => null,
}))

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }))

jest.mock('@pa/ui', () => {
  const mockReact = jest.requireActual('react')
  const mockRN = jest.requireActual('react-native')
  const passthrough =
    (Component: unknown) =>
    ({ children }: { children?: React.ReactNode }) =>
      mockReact.createElement(Component, null, children)
  const pressable = ({
    children,
    onPress,
    disabled,
    accessibilityLabel,
  }: any) =>
    mockReact.createElement(
      mockRN.Pressable,
      { onPress, disabled, accessibilityLabel },
      children,
    )
  const color = new Proxy({}, { get: () => '#000' })
  return {
    YStack: passthrough(mockRN.View),
    XStack: passthrough(mockRN.View),
    Card: passthrough(mockRN.View),
    InfoCard: passthrough(mockRN.View),
    Text: passthrough(mockRN.Text),
    ButtonText: passthrough(mockRN.Text),
    MicroLabel: passthrough(mockRN.Text),
    LinkText: pressable,
    Button: pressable,
    LoadingSpinner: () => null,
    Spinner: () => null,
    StyledInput: mockReact.forwardRef(
      ({ value, onChangeText, accessibilityLabel }: any, ref: unknown) =>
        mockReact.createElement(mockRN.TextInput, {
          ref,
          value,
          onChangeText,
          accessibilityLabel,
        }),
    ),
    brandColors: color,
    semanticColors: new Proxy({}, { get: () => color }),
    neutralColors: new Proxy({}, { get: () => color }),
    cardColors: color,
  }
})

const navigation = { navigate: jest.fn(), goBack: jest.fn() }

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
})

describe('SignInScreen', () => {
  it('signs in with the address as typed', async () => {
    mockSignIn.mockResolvedValue({ signingIn: false })
    render(
      <SignInScreen navigation={navigation as never} route={{} as never} />,
    )
    fireEvent.changeText(
      screen.getByLabelText('Email address'),
      ' Jane@X.test ',
    )
    fireEvent.changeText(screen.getByLabelText('Password'), 'correct horse')
    fireEvent.press(screen.getByLabelText('Sign in'))

    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith('CodeVerification', {
        email: 'Jane@X.test',
      }),
    )
    expect(mockSignIn).toHaveBeenCalledWith('password', {
      flow: 'signIn',
      email: 'Jane@X.test',
      password: 'correct horse',
    })
  })
})

describe('SignUpScreen', () => {
  function fillIn(email: string) {
    render(
      <SignUpScreen navigation={navigation as never} route={{} as never} />,
    )
    fireEvent.changeText(screen.getByLabelText('First name'), 'Jane')
    fireEvent.changeText(screen.getByLabelText('Last name'), 'Peeters')
    fireEvent.changeText(screen.getByLabelText('Email address'), email)
    fireEvent.changeText(screen.getByLabelText('Password'), 'secret123')
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'secret123')
    fireEvent.press(screen.getByLabelText('Create account'))
  }

  it('signs up with the address as typed', async () => {
    mockSignIn.mockResolvedValue({ signingIn: false })
    fillIn(' Jane@X.test')

    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith('CodeVerification', {
        email: 'Jane@X.test',
      }),
    )
    expect(mockSignIn).toHaveBeenCalledWith(
      'password',
      expect.objectContaining({ flow: 'signUp', email: 'Jane@X.test' }),
    )
  })

  it('offers to sign in when the address is registered already', async () => {
    mockSignIn.mockRejectedValue(
      new ConvexError({
        code: 'EMAIL_IN_USE',
        message: 'An account with this email already exists. Sign in instead.',
      }),
    )
    fillIn('jane@x.test')

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Already registered',
        expect.stringMatching(/already registered\. Sign in/),
        expect.any(Array),
      ),
    )
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
      text: string
      onPress?: () => void
    }[]
    buttons.find(button => button.text === 'Sign in')?.onPress?.()
    expect(navigation.navigate).toHaveBeenCalledWith('SignIn')
  })
})

describe('ForgotPasswordScreen', () => {
  function requestReset(email: string) {
    render(
      <ForgotPasswordScreen
        navigation={navigation as never}
        route={{} as never}
      />,
    )
    fireEvent.changeText(screen.getByLabelText('Email address'), email)
    fireEvent.press(screen.getByLabelText('Send reset link'))
  }

  it('asks for a link for the address as typed', async () => {
    mockSignIn.mockResolvedValue({ signingIn: false })
    requestReset(' Jane@X.test ')

    await waitFor(() =>
      expect(screen.getByText('Check your email')).toBeTruthy(),
    )
    expect(mockSignIn).toHaveBeenCalledWith('password', {
      flow: 'reset',
      email: 'Jane@X.test',
      redirectTo: 'personalassistant://reset-password?email=Jane%40X.test',
    })
  })

  it('says to wait, not "sent", when a link was just sent', async () => {
    mockSignIn.mockRejectedValue(
      new ConvexError({
        code: 'TOO_MANY_REQUESTS',
        message: 'We just emailed this address. Try again in 1 minute.',
      }),
    )
    requestReset('jane@x.test')

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Please wait',
        'We just emailed this address. Try again in 1 minute.',
      ),
    )
    expect(screen.queryByText('Check your email')).toBeNull()
  })

  it('still answers "sent" for other failures, which only accounts have', async () => {
    mockSignIn.mockRejectedValue(new Error('Could not send email'))
    requestReset('jane@x.test')

    await waitFor(() =>
      expect(screen.getByText('Check your email')).toBeTruthy(),
    )
    expect(Alert.alert).not.toHaveBeenCalled()
  })
})
