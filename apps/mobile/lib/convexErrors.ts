import { ConvexError } from 'convex/values'

/**
 * The code and message a backend ConvexError carries in `data`, or null for
 * any other error. The error's own `message` is the Convex envelope (function
 * path, request id), so the readable text only lives here.
 */
export function convexErrorData(
  error: unknown,
): { code?: string; message?: string } | null {
  if (!(error instanceof ConvexError)) return null
  const data: unknown = error.data
  if (typeof data === 'string') return { message: data }
  if (!data || typeof data !== 'object') return {}
  const record = data as Record<string, unknown>
  return {
    code: typeof record.code === 'string' ? record.code : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
  }
}
