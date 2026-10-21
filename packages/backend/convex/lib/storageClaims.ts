/**
 * Storage ownership
 *
 * Storage ids are not secret: every image
 * id is readable by anyone who can see the content it belongs to. Mutations used to accept
 * any `_storage` id from the client, so a user could attach someone else's file
 * to their own profile or content — and deleting their account then deleted
 * the other user's file.
 *
 * Every blob is claimed by the user who first attaches it (a row in
 * `storageClaims`). A client-supplied id is accepted when the caller already
 * owns it, or when it is a fresh upload nobody has claimed yet, which the
 * caller then claims. Deletion only removes blobs the user owns.
 */

import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { permanentError } from './errors'

/**
 * How long after an upload its uploader may still claim it.
 *
 * Until a fresh blob is attached, only the uploader knows its id, and
 * attaching it claims it. So this window mostly keeps blobs uploaded before
 * claims existed — whose ids are visible on published content — from being
 * claimed by someone else. It has to cover editors that upload an image
 * first and only attach it when the whole form is saved.
 */
export const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000

async function getClaim(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<'_storage'>,
) {
  return await ctx.db
    .query('storageClaims')
    .withIndex('by_storage_id', q => q.eq('storageId', storageId))
    .first()
}

/**
 * Require that the user may attach this blob, claiming it if it is a fresh
 * unclaimed upload.
 *
 * @throws permanent FORBIDDEN if the blob belongs to someone else or is too
 *   old to be a fresh upload, NOT_FOUND if it does not exist
 */
export async function claimStorage(
  ctx: MutationCtx,
  storageId: Id<'_storage'>,
  userId: Id<'users'>,
): Promise<void> {
  const claim = await getClaim(ctx, storageId)
  if (claim) {
    if (claim.userId === userId) return
    throw permanentError('FORBIDDEN', 'This file belongs to another user')
  }

  const blob = await ctx.db.system.get(storageId)
  if (!blob) throw permanentError('NOT_FOUND', 'Uploaded file not found')

  const now = Date.now()
  if (now - blob._creationTime > CLAIM_WINDOW_MS) {
    throw permanentError(
      'FORBIDDEN',
      'This file was not uploaded by you or its upload has expired. Upload it again.',
    )
  }
  await ctx.db.insert('storageClaims', { storageId, userId, claimedAt: now })
}

/**
 * Claim every id the client supplied that is not already attached to the
 * document being edited. Ids that are already there are the document's own
 * files (possibly uploaded before claims existed) and are left as they are.
 */
export async function claimNewStorageIds(
  ctx: MutationCtx,
  userId: Id<'users'>,
  supplied: Iterable<Id<'_storage'> | undefined>,
  alreadyAttached: Iterable<Id<'_storage'> | undefined> = [],
): Promise<void> {
  const attached = new Set<string>()
  for (const id of alreadyAttached) if (id) attached.add(id)
  for (const id of supplied) {
    if (id && !attached.has(id)) await claimStorage(ctx, id, userId)
  }
}

/** Record a blob the server itself stored on the user's behalf. */
export async function recordStorageClaim(
  ctx: MutationCtx,
  storageId: Id<'_storage'>,
  userId: Id<'users'>,
): Promise<void> {
  if (await getClaim(ctx, storageId)) return
  await ctx.db.insert('storageClaims', {
    storageId,
    userId,
    claimedAt: Date.now(),
  })
}

/**
 * Delete a blob referenced by one of the user's documents, if it is the
 * user's own file. Returns whether it was deleted.
 *
 * A blob claimed by someone else is never deleted. A blob nobody has claimed
 * was uploaded before claims existed; it is treated as the user's own unless
 * it predates the document that references it (`referencedSince`, the
 * document's creation time) by more than the claim window — reusing someone
 * else's existing file means pointing a new document at an older blob, while
 * a creator uploads a file shortly before or after the document it belongs to.
 * Pass null to delete only a blob the user has claimed.
 */
export async function deleteOwnedBlob(
  ctx: MutationCtx,
  storageId: Id<'_storage'>,
  userId: Id<'users'>,
  referencedSince: number | null,
): Promise<boolean> {
  const claim = await getClaim(ctx, storageId)
  if (claim && claim.userId !== userId) return false
  const blob = await ctx.db.system.get(storageId)
  if (
    !claim &&
    (!blob ||
      referencedSince === null ||
      blob._creationTime < referencedSince - CLAIM_WINDOW_MS)
  ) {
    return false
  }
  if (claim) await ctx.db.delete(claim._id)
  if (!blob) return false
  await ctx.storage.delete(storageId)
  return true
}
