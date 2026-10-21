/**
 * Generate a cryptographically secure random string without modulo bias.
 * Convex functions expose the Web Crypto API in their runtime.
 */
export function generateRandomString(length: number, alphabet: string): string {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('length must be a non-negative safe integer')
  }
  if (alphabet.length < 2 || alphabet.length > 256) {
    throw new RangeError('alphabet must contain between 2 and 256 characters')
  }

  const acceptedByteLimit = Math.floor(256 / alphabet.length) * alphabet.length
  let result = ''

  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length - result.length))

    for (const byte of bytes) {
      if (byte < acceptedByteLimit) {
        result += alphabet[byte % alphabet.length]
      }
    }
  }

  return result
}
