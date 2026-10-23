/**
 * Which week a meal plan is for. Plans are made in Belgium, so weeks follow
 * Belgian dates: from Friday on, a new plan is for the coming week.
 */

const TIME_ZONE = 'Europe/Brussels'
const DAY_MS = 24 * 60 * 60 * 1000

/** The date in Belgium, YYYY-MM-DD. */
export function belgianDate(now: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now))
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

/**
 * The Monday of the week a plan made now is for: this week from Monday to
 * Thursday, next week from Friday on.
 */
export function planWeekStart(now: number): string {
  const today = belgianDate(now)
  // 0 = Monday … 6 = Sunday
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  return weekday >= 4 ? addDays(today, 7 - weekday) : addDays(today, -weekday)
}
