/**
 * Tests for the app's crash safety net.
 *
 * Wired into every navigator through `screenLayout`, so a render throw shows a
 * recoverable fallback for that one screen instead of white-screening the whole
 * app — which is what happened before it existed, mid-quest, with an attempt in
 * progress.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ScreenBoundary, screenBoundaryLayout } from '../ScreenBoundary'

// The design system is stubbed out deliberately. Importing @pa/ui pulls
// in Tamagui's web build, which needs a DOM and its own react-dom — none of
// which this test is about. What matters here is that a throw is caught,
// reported and recoverable.
jest.mock('@pa/ui', () => {
  // Required inside the factory: jest hoists mocks above imports, so nothing
  // from module scope — not even a type alias — is in scope here.
  const mockReact = jest.requireActual('react')
  const mockRN = jest.requireActual('react-native')

  const passthrough =
    (Component: unknown) =>
    ({ children, ...rest }: any) =>
      mockReact.createElement(Component, rest, children)

  return {
    YStack: passthrough(mockRN.View),
    Text: passthrough(mockRN.Text),

    Button: ({ children, onPress }: any) =>
      mockReact.createElement(mockRN.Text, { onPress }, children),
    neutralColors: {
      background: { page: '#000' },
      text: { muted: '#888' },
    },
  }
})

function Boom({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) throw new Error('render exploded')
  return <Text>content</Text>
}

describe('ScreenBoundary', () => {
  // React logs the caught error; silence it so the run stays readable.
  let consoleError: jest.SpyInstance
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    consoleError.mockRestore()
    jest.clearAllMocks()
  })

  it('renders its children when nothing is wrong', () => {
    render(
      <ScreenBoundary name='Quests'>
        <Boom shouldThrow={false} />
      </ScreenBoundary>,
    )
    expect(screen.getByText('content')).toBeTruthy()
  })

  it('shows a fallback instead of unmounting the app', () => {
    render(
      <ScreenBoundary name='Quests'>
        <Boom shouldThrow />
      </ScreenBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.queryByText('content')).toBeNull()
  })

  it('reassures the member their data is safe', () => {
    // A crashed screen loses nothing stored on the server, and the copy says so.
    render(
      <ScreenBoundary name='Home'>
        <Boom shouldThrow />
      </ScreenBoundary>,
    )
    expect(screen.getByText(/data is safe/i)).toBeTruthy()
  })

  it('recovers when the player retries and the cause is gone', () => {
    function Flaky({ fail }: { fail: boolean }) {
      return (
        <ScreenBoundary name='Quests'>
          <Boom shouldThrow={fail} />
        </ScreenBoundary>
      )
    }

    const { rerender } = render(<Flaky fail />)
    expect(screen.getByText('Something went wrong')).toBeTruthy()

    // A transient failure — the data arrives, the player taps retry.
    rerender(<Flaky fail={false} />)
    fireEvent.press(screen.getByText('Try again'))

    expect(screen.getByText('content')).toBeTruthy()
  })

  describe('screenLayout helper', () => {
    it('wraps a navigator screen in a boundary', () => {
      const Layout = screenBoundaryLayout('Settings')
      render(<Layout>{<Boom shouldThrow />}</Layout>)

      expect(screen.getByText('Something went wrong')).toBeTruthy()
    })

    it('passes children through when they render', () => {
      const Layout = screenBoundaryLayout('Settings')
      render(<Layout>{<Boom shouldThrow={false} />}</Layout>)
      expect(screen.getByText('content')).toBeTruthy()
    })
  })
})
