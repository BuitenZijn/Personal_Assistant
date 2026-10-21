import { useQuery, type OptionalRestArgsOrSkip } from 'convex/react'
import type { FunctionReference } from 'convex/server'

/**
 * A Convex query's result, with loading made explicit.
 *
 * Convex signals "still loading" by returning `undefined`, which is the same
 * value a query returns for a record that does not exist. Every screen was
 * hand-checking `x === undefined` and writing its own spinner, and the two
 * cases are easy to conflate. Discriminating on `status` makes the difference
 * impossible to miss and lets TypeScript narrow `data` for you.
 */
export type QueryState<T> =
  { status: 'loading'; data: undefined } | { status: 'ready'; data: T }

/**
 * `useQuery` with the loading state named.
 *
 * Passing `'skip'` as the args keeps the query from running, exactly as with
 * `useQuery`; the state stays `loading` for as long as it is skipped.
 *
 * @example
 * const quest = useQueryState(api.functions.quests.get, { id })
 * if (quest.status === 'loading') return <LoadingSpinner />
 * // quest.data is narrowed to the query's return type here
 */
export function useQueryState<Query extends FunctionReference<'query'>>(
  query: Query,
  ...args: OptionalRestArgsOrSkip<Query>
): QueryState<Query['_returnType']> {
  const data = useQuery(query, ...args)

  if (data === undefined) {
    return { status: 'loading', data: undefined }
  }
  return { status: 'ready', data }
}
