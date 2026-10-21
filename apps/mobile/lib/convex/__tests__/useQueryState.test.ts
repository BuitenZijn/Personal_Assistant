/**
 * Unit tests for useQueryState — naming Convex's loading state.
 */
import { renderHook } from '@testing-library/react-native'
import { useQuery } from 'convex/react'
import { useQueryState } from '../useQueryState'

jest.mock('convex/react', () => ({ useQuery: jest.fn() }))

const mockUseQuery = useQuery as unknown as jest.Mock

// The query reference is opaque to the hook — it only forwards it.
const anyQuery = {} as Parameters<typeof useQueryState>[0]

describe('useQueryState', () => {
  afterEach(() => mockUseQuery.mockReset())

  it('reports loading while Convex returns undefined', () => {
    mockUseQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useQueryState(anyQuery))

    expect(result.current.status).toBe('loading')
    expect(result.current.data).toBeUndefined()
  })

  it('reports ready once data arrives', () => {
    mockUseQuery.mockReturnValue([{ id: 1 }])
    const { result } = renderHook(() => useQueryState(anyQuery))

    expect(result.current.status).toBe('ready')
    expect(result.current.data).toEqual([{ id: 1 }])
  })

  it('treats null as ready, not loading', () => {
    // A query that resolves to null has answered: the record is not there.
    // Only `undefined` means "still loading" — conflating the two is the
    // mistake this hook exists to prevent.
    mockUseQuery.mockReturnValue(null)
    const { result } = renderHook(() => useQueryState(anyQuery))

    expect(result.current.status).toBe('ready')
    expect(result.current.data).toBeNull()
  })

  it('treats an empty array as ready', () => {
    mockUseQuery.mockReturnValue([])
    const { result } = renderHook(() => useQueryState(anyQuery))

    expect(result.current.status).toBe('ready')
    expect(result.current.data).toEqual([])
  })

  it('forwards args through to useQuery', () => {
    mockUseQuery.mockReturnValue(undefined)
    renderHook(() => useQueryState(anyQuery, { id: 'abc' }))

    expect(mockUseQuery).toHaveBeenCalledWith(anyQuery, { id: 'abc' })
  })

  it('stays loading while the query is skipped', () => {
    mockUseQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useQueryState(anyQuery, 'skip'))

    expect(mockUseQuery).toHaveBeenCalledWith(anyQuery, 'skip')
    expect(result.current.status).toBe('loading')
  })
})
