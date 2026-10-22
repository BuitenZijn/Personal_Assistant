/**
 * Import a receipt export into your household (see docs/PLAN.md, Phase 2).
 *
 *   pnpm import:receipts path/to/receipts.csv
 *
 * Signs in with your app account (PA_EMAIL / PA_PASSWORD, or asks) and adds
 * the receipts to your household. Safe to run again with a newer or
 * overlapping export: receipts already imported are replaced, not doubled.
 * Talks to the deployment in packages/backend/.env.local (CONVEX_URL).
 */

import { readFileSync, existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { resolve } from 'node:path'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'
import { decodeExport, parseExport, type Receipt } from './receiptCsv.ts'

/** Per call; the backend takes at most 50 receipts and 1500 lines. */
const RECEIPTS_PER_BATCH = 25
const LINES_PER_BATCH = 1000

async function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  if (hidden) {
    // Echo nothing while the password is typed.
    const output = rl as unknown as { _writeToOutput: (s: string) => void }
    let prompted = false
    output._writeToOutput = (s: string) => {
      if (!prompted) {
        process.stdout.write(s)
        prompted = true
      }
    }
  }
  const answer = await rl.question(question)
  rl.close()
  if (hidden) process.stdout.write('\n')
  return answer.trim()
}

function batches(receipts: Receipt[]): Receipt[][] {
  const result: Receipt[][] = []
  let current: Receipt[] = []
  let lines = 0
  for (const receipt of receipts) {
    if (
      current.length > 0 &&
      (current.length >= RECEIPTS_PER_BATCH ||
        lines + receipt.lines.length > LINES_PER_BATCH)
    ) {
      result.push(current)
      current = []
      lines = 0
    }
    current.push(receipt)
    lines += receipt.lines.length
  }
  if (current.length > 0) result.push(current)
  return result
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: pnpm import:receipts <file.csv>')
    process.exitCode = 1
    return
  }

  const envFile = resolve(import.meta.dirname, '../.env.local')
  if (existsSync(envFile)) process.loadEnvFile(envFile)
  const url = process.env.CONVEX_URL
  if (!url) {
    console.error('Set CONVEX_URL, or run `npx convex dev` once to write it.')
    process.exitCode = 1
    return
  }

  // pnpm runs scripts from the workspace root; INIT_CWD is where you ran it.
  const path = resolve(process.env.INIT_CWD ?? process.cwd(), file)
  const parsed = parseExport(decodeExport(readFileSync(path)))
  const lineCount = parsed.receipts.reduce((n, r) => n + r.lines.length, 0)
  const dates = parsed.receipts.map(r => r.date)
  console.log(
    `Read ${parsed.receipts.length} receipts with ${lineCount} lines` +
      (dates.length ? `, ${dates[0]} to ${dates[dates.length - 1]}` : '') +
      ` (skipped ${parsed.skipped} card scans).`,
  )
  for (const error of parsed.errors) {
    console.warn(`  Line ${error.line} left out: ${error.message}`)
  }
  if (parsed.receipts.length === 0) return

  const email = process.env.PA_EMAIL || (await ask('Email: '))
  const password = process.env.PA_PASSWORD || (await ask('Password: ', true))

  const client = new ConvexHttpClient(url)
  const signedIn = await client.action(api.auth.signIn, {
    provider: 'password',
    params: { flow: 'signIn', email, password },
  })
  const token = signedIn.tokens?.token
  if (!token) {
    console.error('Could not sign in. Check your email and password.')
    process.exitCode = 1
    return
  }
  client.setAuth(token)

  const household = await client.query(api.functions.households.mine)
  if (!household) {
    console.error('Open the app once first, so your household is set up.')
    process.exitCode = 1
    return
  }

  let created = 0
  let replaced = 0
  for (const batch of batches(parsed.receipts)) {
    const result = await client.mutation(
      api.functions.receipts.importReceipts,
      { receipts: batch },
    )
    created += result.created
    replaced += result.replaced
    process.stdout.write('.')
  }
  console.log(
    `\nDone: ${created} new and ${replaced} updated receipts in ${household.household.name}.`,
  )
}

main().catch((error: unknown) => {
  const data = (error as { data?: { message?: string } }).data
  console.error(data?.message ?? error)
  // Not process.exit(): on Windows it aborts while fetch handles close.
  process.exitCode = 1
})
