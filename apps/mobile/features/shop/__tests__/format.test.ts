import { lineQuantity, products, recipeTitles, stepQuantity } from '../format'

describe('shop formatting', () => {
  it('writes a line’s quantity', () => {
    const line = { productId: 'p1', soldByWeight: false }
    expect(lineQuantity({ ...line, quantity: 3 })).toBe('3×')
    expect(lineQuantity({ ...line, quantity: 0.45, soldByWeight: true })).toBe(
      '0,45 kg',
    )
    expect(
      lineQuantity({ soldByWeight: false, quantity: 200, unit: 'g' }),
    ).toBe('200 g')
    expect(lineQuantity({ soldByWeight: false })).toBe('')
  })

  it('steps by a piece, or by 100 g', () => {
    expect(stepQuantity(2, false, -1)).toBe(1)
    expect(stepQuantity(1, false, -1)).toBe(1)
    expect(stepQuantity(0.5, true, 1)).toBe(0.6)
    expect(stepQuantity(0.1, true, -1)).toBe(0.1)
  })

  it('names the recipes a line is for', () => {
    expect(
      recipeTitles([
        '300 g gehakt (Lasagne)',
        '300 g gehakt (Chili)',
        '1 ui (Lasagne)',
      ]),
    ).toBe('Lasagne, Chili')
    expect(products(1)).toBe('1 product')
  })
})
