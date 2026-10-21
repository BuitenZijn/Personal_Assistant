import type { KeyboardEvent } from 'react'

type PressableRole = 'button' | 'radio' | 'checkbox'

/**
 * Props that make a pressable stack (an XStack with `onPress`, which renders
 * a <div> on web) reachable and operable from the keyboard: focusable, given
 * a role, and activated with Enter or Space like a real button. Native
 * ignores the keyboard parts.
 */
export function keyboardPressable(
  onPress: (() => void) | undefined,
  {
    role = 'button',
    disabled,
  }: { role?: PressableRole; disabled?: boolean } = {},
) {
  return {
    role,
    tabIndex: disabled ? -1 : 0,
    'aria-disabled': disabled || undefined,
    onKeyDown: (event: KeyboardEvent) => {
      // Keys pressed on a focusable child are the child's own business
      if (disabled || event.target !== event.currentTarget) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onPress?.()
      }
    },
  } as const
}
