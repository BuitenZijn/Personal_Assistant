import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Account-deletion passes chain via ctx.scheduler, and scheduled functions
// are not retried automatically — a single failed pass would strand the
// cascade. Any user row still carrying deletionRequestedAt gets its cascade
// restarted here.
crons.interval(
  'resume stuck account deletions',
  { hours: 6 },
  internal.functions.users.resumeStuckAccountDeletions,
  {},
)

export default crons
