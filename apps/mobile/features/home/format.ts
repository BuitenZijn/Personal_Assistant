const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "2026-10-19" → "19 Oct" */
export function dayMonth(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  if (!month || !day) return date
  return `${day} ${MONTHS[month - 1]}`
}

/** "3 dinners", "1 dinner" */
export function dinners(n: number): string {
  return n === 1 ? '1 dinner' : `${n} dinners`
}

/** "4 people", "1 person" */
export function people(n: number): string {
  return n === 1 ? '1 person' : `${n} people`
}
