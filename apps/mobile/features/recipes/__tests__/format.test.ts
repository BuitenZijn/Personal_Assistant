import { cookingTime, matchesSearch, recipeMeta } from '../format'

describe('recipe formatting', () => {
  it('writes cooking times', () => {
    expect(cookingTime(45)).toBe('45 min')
    expect(cookingTime(60)).toBe('1 h')
    expect(cookingTime(70)).toBe('1 h 10 min')
  })

  it('joins what a recipe has', () => {
    expect(recipeMeta(70, 4)).toBe('1 h 10 min · 4 people')
    expect(recipeMeta(null, 1)).toBe('1 person')
    expect(recipeMeta(30, null)).toBe('30 min')
    expect(recipeMeta(null, null)).toBe('')
  })

  it('finds titles by every word, ignoring case and accents', () => {
    const title = 'Crème brûlée met Peer'
    expect(matchesSearch(title, '')).toBe(true)
    expect(matchesSearch(title, 'creme peer')).toBe(true)
    expect(matchesSearch(title, 'BRULEE')).toBe(true)
    expect(matchesSearch(title, 'peer appel')).toBe(false)
  })
})
