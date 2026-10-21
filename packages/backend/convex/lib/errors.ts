import { ConvexError } from 'convex/values'

/**
 * Error codes for conditions that can never succeed on retry.
 * apps/mobile/lib/sync/SyncManager.ts).
 *
 * The queue retries anything else with backoff, and it is strict FIFO: a
 * condition that can never succeed on retry, thrown as a plain `Error`, sits at
 * the head of the queue forever and silently stops every action behind it from
 * syncing. Throw those conditions through `permanentError` instead.
 */
export type PermanentErrorCode = 'INVALID_ARGUMENT' | 'FORBIDDEN' | 'NOT_FOUND'

// A type alias, not an interface: ConvexError data must satisfy `Value`, which
// needs the implicit index signature only type aliases get.
export type PermanentErrorData = {
  code: PermanentErrorCode
  message: string
}

/** `throw permanentError('NOT_FOUND', 'Quest attempt not found')` */
export function permanentError(
  code: PermanentErrorCode,
  message: string,
): ConvexError<PermanentErrorData> {
  return new ConvexError({ code, message })
}
