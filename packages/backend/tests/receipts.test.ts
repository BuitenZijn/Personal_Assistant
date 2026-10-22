import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import { purchaseStats } from '../convex/lib/productStats'
import {
  decodeExport,
  isSoldByWeight,
  parseDecimal,
  parseExport,
  type Receipt,
} from '../scripts/receiptCsv'
import { expectPermanentError, userFixture } from './fixtures'

const HEADER =
  'datum\tKASTICKETNR_TS\tartikelnr\tartikelnaam_nl\tsum(akt.OMZET_INCL_KLANT)\tsum(akt.AANTAL_STOCKEENHEDEN)'

function row(cells: string[]) {
  return cells.join('\t')
}

/** The export as the store sends it: UTF-16 LE with a byte-order mark. */
function utf16(text: string): Uint8Array {
  const bytes = new Uint8Array(2 + text.length * 2)
  bytes[0] = 0xff
  bytes[1] = 0xfe
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes[2 + i * 2] = code & 0xff
    bytes[3 + i * 2] = code >> 8
  }
  return bytes
}

const EXPORT = [
  HEADER,
  row([
    '"2026-03-26"',
    '2026032635150013741',
    '29013',
    '"BONI BANANEN W"',
    '2,100',
    '11,100',
  ]),
  row([
    '"2026-03-26"',
    '2026032635150013741',
    '1663306',
    '"BONI PAIN DE MIE 500"',
    '4,600',
    '4,000',
  ]),
  row([
    '"2026-03-26"',
    '2026032635150013741',
    '1703497',
    '"PUBLIKAART                 A"',
    '0,000',
    '0,000',
  ]),
  row([
    '"2026-01-02"',
    '2026010235150010451',
    '3020248',
    '"MILKA OREO 100GR"',
    ',990',
    '1,000',
  ]),
  row([
    '"2026-01-02"',
    '2026010235150010451',
    '29013',
    '"BONI BANANEN W"',
    '2,900',
    '14,580',
  ]),
  row(['"bad"', '1', '2', '"X"', '1,000', '1,000']),
  // Sold by weight, but the "W" cut off with the end of the name.
  row([
    '"2026-01-02"',
    '2026010235150010451',
    '4910632',
    '"CHOKLA-BAR LINDT GEWICH"',
    '7,210',
    '1,720',
  ]),
  '',
].join('\r\n')

describe('reading the export', () => {
  it('reads UTF-16 with a byte-order mark', () => {
    expect(decodeExport(utf16('datum\tx'))).toBe('datum\tx')
  })

  it('reads decimal commas', () => {
    expect(parseDecimal('2,990')).toBe(2.99)
    expect(parseDecimal(',990')).toBe(0.99)
    expect(parseDecimal('1.234,5')).toBe(1234.5)
    expect(parseDecimal('-1,000')).toBe(-1)
    expect(parseDecimal('abc')).toBeNull()
  })

  it('tells articles sold by weight', () => {
    expect(isSoldByWeight('BONI BANANEN W')).toBe(true)
    expect(isSoldByWeight('TOMATEN EXTRA W.')).toBe(true)
    expect(isSoldByWeight('BRUGGE D OR BLOK+-450GW')).toBe(true)
    expect(isSoldByWeight('BONI PAIN DE MIE 500')).toBe(false)
    expect(isSoldByWeight('MANGO STUK RTE')).toBe(false)
  })

  it('groups rows into receipts, oldest first', () => {
    const parsed = parseExport(decodeExport(utf16(EXPORT)))
    expect(parsed.skipped).toBe(1)
    expect(parsed.errors).toEqual([expect.objectContaining({ line: 7 })])
    expect(parsed.receipts).toEqual([
      {
        ticketNumber: '2026010235150010451',
        date: '2026-01-02',
        store: '3515',
        lines: [
          {
            articleNumber: '3020248',
            name: 'MILKA OREO 100GR',
            quantity: 1,
            amountCents: 99,
            soldByWeight: false,
          },
          {
            articleNumber: '29013',
            name: 'BONI BANANEN W',
            quantity: 1.458,
            amountCents: 290,
            soldByWeight: true,
          },
          {
            articleNumber: '4910632',
            name: 'CHOKLA-BAR LINDT GEWICH',
            quantity: 0.172,
            amountCents: 721,
            soldByWeight: true,
          },
        ],
      },
      expect.objectContaining({
        ticketNumber: '2026032635150013741',
        lines: [
          expect.objectContaining({ quantity: 1.11, amountCents: 210 }),
          expect.objectContaining({ quantity: 4, amountCents: 460 }),
        ],
      }),
    ])
  })

  it('refuses a file without the columns', () => {
    expect(() => parseExport('a\tb\n1\t2')).toThrow(/missing column/)
  })
})

describe('purchase stats', () => {
  it('counts days, intervals and the last price', () => {
    expect(
      purchaseStats([
        { date: '2026-01-01', quantity: 2, amountCents: 300 },
        { date: '2026-01-01', quantity: 1, amountCents: 150 },
        { date: '2026-01-15', quantity: 2, amountCents: 320 },
        { date: '2026-01-29', quantity: 1, amountCents: 170 },
      ]),
    ).toEqual({
      timesBought: 3,
      totalQuantity: 6,
      totalSpentCents: 940,
      firstBoughtOn: '2026-01-01',
      lastBoughtOn: '2026-01-29',
      averageIntervalDays: 14,
      averageQuantity: 2,
      lastUnitPriceCents: 170,
    })
  })

  it('needs two days for an interval, and a quantity to count', () => {
    expect(
      purchaseStats([{ date: '2026-01-01', quantity: 1, amountCents: 100 }])
        ?.averageIntervalDays,
    ).toBeUndefined()
    expect(
      purchaseStats([{ date: '2026-01-01', quantity: 0, amountCents: 0 }]),
    ).toBeNull()
  })
})

describe('importing receipts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const receipts: Receipt[] = parseExport(EXPORT).receipts

  async function imported() {
    const fixture = await userFixture()
    await fixture.authorClient.mutation(api.functions.households.setUp)
    const result = await fixture.authorClient.mutation(
      api.functions.receipts.importReceipts,
      { receipts },
    )
    await fixture.t.finishAllScheduledFunctions(vi.runAllTimers)
    return { ...fixture, result }
  }

  it('stores receipts and lists products, most bought first', async () => {
    const { authorClient, result } = await imported()
    expect(result).toEqual({ created: 2, replaced: 0, lines: 5 })

    const products = await authorClient.query(
      api.functions.receipts.myProducts,
      {},
    )
    expect(products[0]).toMatchObject({
      name: 'BONI BANANEN W',
      soldByWeight: true,
      timesBought: 2,
      totalQuantity: 2.568,
      averageIntervalDays: 83,
      lastUnitPriceCents: 189,
    })
    expect(products).toHaveLength(4)

    const summary = await authorClient.query(api.functions.receipts.summary)
    expect(summary).toEqual({
      receiptCount: 2,
      firstDate: '2026-01-02',
      lastDate: '2026-03-26',
    })
  })

  it('finds products by name', async () => {
    const { authorClient } = await imported()
    const found = await authorClient.query(api.functions.receipts.myProducts, {
      search: 'oreo',
    })
    expect(found.map(p => p.name)).toEqual(['MILKA OREO 100GR'])
  })

  it('replaces a receipt imported again', async () => {
    const { t, authorClient } = await imported()
    const again = await authorClient.mutation(
      api.functions.receipts.importReceipts,
      { receipts },
    )
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(again).toEqual({ created: 0, replaced: 2, lines: 5 })
    const counts = await t.run(async ctx => ({
      receipts: (await ctx.db.query('receipts').collect()).length,
      lines: (await ctx.db.query('receiptLines').collect()).length,
      products: (await ctx.db.query('products').collect()).length,
      stats: (await ctx.db.query('productStats').collect()).length,
    }))
    expect(counts).toEqual({ receipts: 2, lines: 5, products: 4, stats: 4 })
  })

  it("keeps each household's receipts to itself", async () => {
    const { playerClient } = await imported()
    await playerClient.mutation(api.functions.households.setUp)
    expect(
      await playerClient.query(api.functions.receipts.myProducts, {}),
    ).toEqual([])
    expect(
      await playerClient.query(api.functions.receipts.summary),
    ).toMatchObject({ receiptCount: 0 })
  })

  it('needs a household', async () => {
    const { authorClient } = await userFixture()
    await expectPermanentError(
      authorClient.mutation(api.functions.receipts.importReceipts, {
        receipts,
      }),
      'NOT_FOUND',
    )
  })

  it('deletes the receipts with the household', async () => {
    const { t, author } = await imported()
    await t.mutation(internal.functions.users.processAccountDeletion, {
      userId: author,
    })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const left = await t.run(async ctx => ({
      receipts: await ctx.db.query('receipts').collect(),
      lines: await ctx.db.query('receiptLines').collect(),
      stats: await ctx.db.query('productStats').collect(),
    }))
    expect(left).toEqual({ receipts: [], lines: [], stats: [] })
  })
})
