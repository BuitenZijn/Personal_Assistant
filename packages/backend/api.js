/**
 * ESM-compatible API export for external consumers.
 *
 * This file re-exports the Convex API in a way that works properly
 * with Node.js ESM imports from other packages in the monorepo.
 */

export { api, internal } from './convex/_generated/api.js'
