/**
 * Alert.alert on the website. React Native Web leaves it empty, so every
 * confirmation and error would silently do nothing in a browser. This fills
 * it in with the browser's own dialogs: one button becomes `alert`, more
 * than one becomes `confirm` (OK runs the first button that isn't Cancel).
 * Imported once, from index.ts; does nothing on a phone.
 */

import { Alert, Platform, type AlertButton } from 'react-native'

function webAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { onDismiss?: () => void },
): void {
  const text = message ? `${title}\n\n${message}` : title
  const actions = (buttons ?? []).filter(b => b.style !== 'cancel')
  const cancel = (buttons ?? []).find(b => b.style === 'cancel')

  if (actions.length === 0 || !cancel) {
    window.alert(text)
    actions[0]?.onPress?.()
    if (actions.length === 0) cancel?.onPress?.()
    return
  }
  if (window.confirm(text)) {
    actions[0]!.onPress?.()
  } else {
    cancel.onPress?.()
    options?.onDismiss?.()
  }
}

if (Platform.OS === 'web') {
  Alert.alert = webAlert
}
