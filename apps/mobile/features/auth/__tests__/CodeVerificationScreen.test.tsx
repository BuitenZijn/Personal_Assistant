/**
 * "Nieuwe code sturen" on the verification screen: it used to sign in with an empty
 * password, which never sent a code, counted as a failed sign-in, and still
 * told the user "Code verstuurd".
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
import { CodeVerificationScreen } from '../screens/CodeVerificationScreen'

const mockSignIn = jest.fn()
const mockResend = jest.fn()

jest.mock('convex/react', () => ({
  useAction: () => mockResend,
}))

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}))

jest.mock('../../../lib/ConvexProvider', () => ({
  useConvexAuth: () => ({ isAuthenticated: false }),
}))

jest.mock('../components/BrandHeader', () => ({ BrandHeader: () => null }))

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }))

jest.mock('@pa/ui', () => {
  const mockReact = jest.requireActual('react')
  const mockRN = jest.requireActual('react-native')
  const passthrough =
    (Component: unknown) =>
    ({ children }: { children?: React.ReactNode }) =>
      mockReact.createElement(Component, null, children)
  const color = new Proxy({}, { get: () => '#000' })
  return {
    YStack: passthrough(mockRN.View),
    XStack: passthrough(mockRN.View),
    Text: passthrough(mockRN.Text),
    ButtonText: passthrough(mockRN.Text),
    LoadingSpinner: () => null,
    Button: ({ children, onPress, disabled, accessibilityLabel }: any) =>
      mockReact.createElement(
        mockRN.Pressable,
        { onPress, disabled, accessibilityLabel },
        children,
      ),
    brandColors: color,
    neutralColors: new Proxy({}, { get: () => color }),
    monoFont: color,
  }
})

function renderScreen(email = ' Jane@X.test') {
  render(
    <CodeVerificationScreen
      navigation={{ goBack: jest.fn() } as never}
      route={{ key: 'k', name: 'CodeVerification', params: { email } } as never}
    />,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
})

it('re-sends the code without a password, for the address as typed', async () => {
  mockResend.mockResolvedValue({ status: 'sent' })
  renderScreen()
  fireEvent.press(screen.getByLabelText('Send a new verification code'))

  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Code sent',
      'We sent a new verification code to Jane@X.test.',
    ),
  )
  // Not lower-cased: the backend matches it whatever its case.
  expect(mockResend).toHaveBeenCalledWith({ email: 'Jane@X.test' })
  expect(mockSignIn).not.toHaveBeenCalled()
})

it('says the last code still works, not "Code sent", when none was sent', async () => {
  // Past the hourly limit the backend keeps the last code instead.
  mockResend.mockResolvedValue({ status: 'reused' })
  renderScreen()
  fireEvent.press(screen.getByLabelText('Send a new verification code'))

  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Check your inbox',
      'Your previous code is still valid — check your inbox (and spam).',
    ),
  )
  expect(Alert.alert).not.toHaveBeenCalledWith('Code sent', expect.anything())
})

it('says "Code sent" when a backend from before the status answers nothing', async () => {
  mockResend.mockResolvedValue(null)
  renderScreen()
  fireEvent.press(screen.getByLabelText('Send a new verification code'))

  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Code sent',
      'We sent a new verification code to Jane@X.test.',
    ),
  )
})

it('says to wait, not "Code sent", when too many codes were requested', async () => {
  mockResend.mockRejectedValue(
    new ConvexError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Try again in 1 minute.',
    }),
  )
  renderScreen()
  fireEvent.press(screen.getByLabelText('Send a new verification code'))

  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Please wait',
      'Try again in 1 minute.',
    ),
  )
  expect(Alert.alert).not.toHaveBeenCalledWith('Code sent', expect.anything())
})

it('does not claim a code was sent when sending failed', async () => {
  mockResend.mockRejectedValue(new Error('Connection lost'))
  renderScreen()
  fireEvent.press(screen.getByLabelText('Send a new verification code'))

  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Code not sent',
      expect.any(String),
    ),
  )
  expect(Alert.alert).not.toHaveBeenCalledWith('Code sent', expect.anything())
})
