/**
 * Reading Colruyt's receipt export (see docs/PLAN.md, Phase 2).
 *
 * The export is UTF-16 text, tab-separated, one row per article per receipt:
 *
 *   datum  KASTICKETNR_TS  artikelnr  artikelnaam_nl
 *   sum(akt.OMZET_INCL_KLANT)  sum(akt.AANTAL_STOCKEENHEDEN)
 *
 * with dates as "2026-03-09", text in quotes and numbers with a decimal
 * comma (",990" is 0.99). The amount is what was paid for the row, discounts
 * included. The quantity is pieces, or for an article sold by weight (its
 * name ends in "W", or its quantity has a fraction), units of 100 g: "BONI BANANEN W" at 11,100 for € 2,10 is
 * 1.11 kg. Rows with neither amount nor quantity are loyalty-card scans
 * ("PUBLIKAART") and are left out.
 */

export type ReceiptLine = {
  articleNumber: string
  name: string
  /** Pieces, or kg when `soldByWeight`. */
  quantity: number
  amountCents: number
  soldByWeight: boolean
}

export type Receipt = {
  ticketNumber: string
  /** YYYY-MM-DD */
  date: string
  /** Store number, from the ticket number. */
  store: string
  lines: ReceiptLine[]
}

export type ParsedExport = {
  receipts: Receipt[]
  /** Card scans and other rows with nothing bought. */
  skipped: number
  /** Rows that could not be read, with their line number in the file. */
  errors: { line: number; message: string }[]
}

const COLUMNS = {
  date: 'datum',
  ticket: 'kasticketnr_ts',
  article: 'artikelnr',
  name: 'artikelnaam_nl',
  amount: 'sum(akt.omzet_incl_klant)',
  quantity: 'sum(akt.aantal_stockeenheden)',
} as const

/** The file's text: UTF-16 when it starts with a byte-order mark, else UTF-8. */
export function decodeExport(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  }
  // Drops a UTF-8 byte-order mark itself.
  return new TextDecoder('utf-8').decode(bytes)
}

function unquote(cell: string): string {
  const trimmed = cell.trim()
  return trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1).replace(/""/g, '"')
    : trimmed
}

/** "2,990" → 2.99, ",990" → 0.99, "1.234,5" → 1234.5; null if not a number. */
export function parseDecimal(text: string): number | null {
  const value = text.trim().replace(/\./g, '').replace(',', '.')
  if (!/^-?\d*\.?\d+$/.test(value)) return null
  return Number(value)
}

/** "BONI BANANEN W", "TOMATEN EXTRA W.", "BRUGGE D OR BLOK+-450GW" */
export function isSoldByWeight(name: string): boolean {
  return /(?:\s|\dG)W\.?$/i.test(name)
}

/**
 * The store number in a ticket number: the date, then four digits for the
 * store ("20260309 4192 001 0731"). Empty when the number isn't shaped so.
 */
export function storeFromTicket(ticket: string, date: string): string {
  const compactDate = date.replace(/-/g, '')
  return ticket.startsWith(compactDate) && ticket.length >= 12
    ? ticket.slice(8, 12)
    : ''
}

export function parseExport(text: string): ParsedExport {
  const rows = text.split(/\r?\n/)
  const header = (rows[0] ?? '').split('\t').map(h => unquote(h).toLowerCase())
  const index = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, name]) => [key, header.indexOf(name)]),
  ) as Record<keyof typeof COLUMNS, number>
  const missing = Object.entries(index)
    .filter(([, i]) => i < 0)
    .map(([key]) => COLUMNS[key as keyof typeof COLUMNS])
  if (missing.length > 0) {
    throw new Error(
      `This isn't a receipt export: missing column(s) ${missing.join(', ')}.`,
    )
  }

  const receipts = new Map<string, Receipt>()
  const errors: ParsedExport['errors'] = []
  let skipped = 0

  rows.slice(1).forEach((row, i) => {
    if (!row.trim()) return
    const lineNumber = i + 2
    const cells = row.split('\t').map(unquote)
    const date = cells[index.date] ?? ''
    const ticketNumber = cells[index.ticket] ?? ''
    const articleNumber = cells[index.article] ?? ''
    const name = (cells[index.name] ?? '').replace(/\s+/g, ' ').trim()
    const amount = parseDecimal(cells[index.amount] ?? '')
    const rawQuantity = parseDecimal(cells[index.quantity] ?? '')

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ line: lineNumber, message: `no valid date: "${date}"` })
      return
    }
    if (!ticketNumber || !articleNumber) {
      errors.push({ line: lineNumber, message: 'no receipt or article number' })
      return
    }
    if (amount === null || rawQuantity === null) {
      errors.push({
        line: lineNumber,
        message: 'amount or quantity unreadable',
      })
      return
    }
    if (amount === 0 && rawQuantity === 0) {
      skipped++
      return
    }

    // A fraction of a stock unit is a weight too: long names lose their "W".
    const soldByWeight = isSoldByWeight(name) || !Number.isInteger(rawQuantity)
    const quantity = soldByWeight
      ? Math.round(rawQuantity * 100) / 1000
      : rawQuantity
    const amountCents = Math.round(amount * 100)

    let receipt = receipts.get(ticketNumber)
    if (!receipt) {
      receipt = {
        ticketNumber,
        date,
        store: storeFromTicket(ticketNumber, date),
        lines: [],
      }
      receipts.set(ticketNumber, receipt)
    }
    // The export sums per article, but merge repeats to be safe.
    const same = receipt.lines.find(l => l.articleNumber === articleNumber)
    if (same) {
      same.quantity = Math.round((same.quantity + quantity) * 1000) / 1000
      same.amountCents += amountCents
    } else {
      receipt.lines.push({
        articleNumber,
        name,
        quantity,
        amountCents,
        soldByWeight,
      })
    }
  })

  return {
    receipts: [...receipts.values()].sort((a, b) =>
      a.date === b.date
        ? a.ticketNumber.localeCompare(b.ticketNumber)
        : a.date.localeCompare(b.date),
    ),
    skipped,
    errors,
  }
}
