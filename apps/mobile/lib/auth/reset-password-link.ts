export interface PasswordResetRequest {
  code: string
  email: string
  preview?: 'form' | 'success'
}

/** Parse only the app's tightly scoped password-reset deep link. */
export function parsePasswordResetLink(
  value: string,
): PasswordResetRequest | null {
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'personalassistant:' ||
      url.hostname !== 'reset-password'
    ) {
      return null
    }

    const code = url.searchParams.get('code')?.trim()
    const email = url.searchParams.get('email')?.trim()
    if (!code || !email) return null

    const requestedPreview = url.searchParams.get('preview')
    const preview =
      __DEV__ && process.env.EXPO_PUBLIC_DESIGN_REVIEW === '1'
        ? requestedPreview === 'success'
          ? 'success'
          : 'form'
        : undefined

    return { code, email, preview }
  } catch {
    return null
  }
}
