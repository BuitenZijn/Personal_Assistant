import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button, Paragraph, XStack, YStack } from 'tamagui'
import { neutralColors, semanticColors } from './colors'

type ToastType = 'success' | 'error' | 'info' | 'confirm'

interface ToastItem {
  id: string
  title: string
  description?: string
  type: ToastType
  duration: number
  onConfirm?: () => void
  onCancel?: () => void
  confirmLabel?: string
  cancelLabel?: string
}

export interface ShowToastOptions {
  title: string
  description?: string
  type?: ToastType
  duration?: number
}

export interface ConfirmToastOptions {
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
}

interface ToastActions {
  show: (options: ShowToastOptions) => string
  success: (
    title: string,
    options?: Omit<ShowToastOptions, 'title' | 'type'>,
  ) => string
  error: (
    title: string,
    options?: Omit<ShowToastOptions, 'title' | 'type'>,
  ) => string
  info: (
    title: string,
    options?: Omit<ShowToastOptions, 'title' | 'type'>,
  ) => string
  confirm: (title: string, options: ConfirmToastOptions) => string
  dismiss: (id: string) => void
}

const DEFAULT_DURATION_MS = 4000
// Two contexts: the actions never change, so the many `useToast` callers
// (including the quest editor and its map) don't re-render when a toast
// appears; only the Toaster reads the list.
const ToastActionsContext = createContext<ToastActions | null>(null)
const ToastListContext = createContext<ToastItem[]>([])

function getToastTone(type: ToastType) {
  switch (type) {
    case 'success':
      return semanticColors.success
    case 'error':
      return semanticColors.error
    case 'confirm':
      return semanticColors.warning ?? semanticColors.info
    case 'info':
    default:
      return semanticColors.info
  }
}

function createToastId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function useToastActions() {
  const actions = useContext(ToastActionsContext)
  if (!actions) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return actions
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const show = useCallback(
    ({
      title,
      description,
      type = 'info',
      duration = DEFAULT_DURATION_MS,
    }: ShowToastOptions) => {
      const id = createToastId()
      const toast: ToastItem = { id, title, description, type, duration }

      setToasts(prev => [toast, ...prev])

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id)
        }, duration)
        timersRef.current.set(id, timer)
      }

      return id
    },
    [dismiss],
  )

  const success = useCallback(
    (title: string, options?: Omit<ShowToastOptions, 'title' | 'type'>) =>
      show({ ...options, title, type: 'success' }),
    [show],
  )

  const error = useCallback(
    (title: string, options?: Omit<ShowToastOptions, 'title' | 'type'>) =>
      show({ ...options, title, type: 'error' }),
    [show],
  )

  const info = useCallback(
    (title: string, options?: Omit<ShowToastOptions, 'title' | 'type'>) =>
      show({ ...options, title, type: 'info' }),
    [show],
  )

  const confirm = useCallback(
    (title: string, options: ConfirmToastOptions) => {
      const id = createToastId()
      const toast: ToastItem = {
        id,
        title,
        description: options.description,
        type: 'confirm',
        duration: 0, // No auto-dismiss for confirmations
        onConfirm: () => {
          dismiss(id)
          options.onConfirm()
        },
        onCancel: () => {
          dismiss(id)
          options.onCancel?.()
        },
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
      }
      setToasts(prev => [toast, ...prev])
      return id
    },
    [dismiss],
  )

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
      timersRef.current.clear()
    },
    [],
  )

  const actions = useMemo<ToastActions>(
    () => ({ show, success, error, info, confirm, dismiss }),
    [confirm, dismiss, error, info, show, success],
  )

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastListContext.Provider value={toasts}>
        {children}
      </ToastListContext.Provider>
    </ToastActionsContext.Provider>
  )
}

/** Stable toast actions; calling components don't re-render on new toasts. */
export function useToast(): ToastActions {
  return useToastActions()
}

export function Toaster() {
  const toasts = useContext(ToastListContext)
  const { dismiss } = useToastActions()

  // The live region stays mounted so screen readers announce new toasts
  return (
    <div
      role='status'
      aria-live='polite'
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 'min(420px, calc(100vw - 32px))',
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      <YStack gap='$2'>
        {toasts.map(toast => {
          const tone = getToastTone(toast.type)

          return (
            <XStack
              key={toast.id}
              backgroundColor={neutralColors.background.elevated}
              borderColor={tone.border}
              borderWidth={1}
              borderRadius={12}
              padding='$3'
              alignItems='center'
              gap='$3'
              pointerEvents='auto'
            >
              <YStack
                width={4}
                alignSelf='stretch'
                borderRadius={999}
                backgroundColor={tone.main}
              />
              <YStack flex={1} gap='$1'>
                <Paragraph color={tone.text} fontWeight='700'>
                  {toast.title}
                </Paragraph>
                {toast.description ? (
                  <Paragraph color={neutralColors.text.secondary} size='$3'>
                    {toast.description}
                  </Paragraph>
                ) : null}
              </YStack>
              {toast.type === 'confirm' ? (
                <XStack gap='$2'>
                  <Button chromeless size='$2' onPress={toast.onCancel}>
                    <Button.Text color={neutralColors.text.secondary}>
                      {toast.cancelLabel ?? 'Cancel'}
                    </Button.Text>
                  </Button>
                  <Button
                    size='$2'
                    backgroundColor={tone.main}
                    borderRadius={8}
                    onPress={toast.onConfirm}
                  >
                    <Button.Text color={neutralColors.text.onFill}>
                      {toast.confirmLabel ?? 'Bevestigen'}
                    </Button.Text>
                  </Button>
                </XStack>
              ) : (
                <Button chromeless size='$2' onPress={() => dismiss(toast.id)}>
                  <Button.Text color={neutralColors.text.secondary}>
                    Sluiten
                  </Button.Text>
                </Button>
              )}
            </XStack>
          )
        })}
      </YStack>
    </div>
  )
}
