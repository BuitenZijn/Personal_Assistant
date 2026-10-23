import { dayMonth, dinners, people } from '../format'

describe('plan formatting', () => {
  it('writes the week and counts', () => {
    expect(dayMonth('2026-10-19')).toBe('19 Oct')
    expect(dayMonth('2027-01-04')).toBe('4 Jan')
    expect(dinners(1)).toBe('1 dinner')
    expect(dinners(5)).toBe('5 dinners')
    expect(people(1)).toBe('1 person')
    expect(people(4)).toBe('4 people')
  })
})
