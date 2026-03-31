import { describe, it, expect } from 'vitest'
import { isInactiveMoreThan5Days, isWithinExpirationRange, sortMembersData } from '@/app/(admin)/members/utils'

describe('isInactiveMoreThan5Days', () => {
  it('returns false for null end date', () => {
    expect(isInactiveMoreThan5Days(null)).toBe(false)
  })

  it('returns true when end date was 6 days ago', () => {
    const sixDaysAgo = new Date()
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
    expect(isInactiveMoreThan5Days(sixDaysAgo.toISOString())).toBe(true)
  })

  it('returns false when end date was 4 days ago', () => {
    const fourDaysAgo = new Date()
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
    expect(isInactiveMoreThan5Days(fourDaysAgo.toISOString())).toBe(false)
  })

  it('returns false when end date is in the future', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isInactiveMoreThan5Days(tomorrow.toISOString())).toBe(false)
  })
})

describe('isWithinExpirationRange', () => {
  it('returns false for null end date', () => {
    expect(isWithinExpirationRange(null)).toBe(false)
  })

  it('returns true when expiration is 2 days from now (within range)', () => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    expect(isWithinExpirationRange(`${day}/${month}/${year}`)).toBe(true)
  })

  it('returns false when expiration is 10 days from now (outside range)', () => {
    const d = new Date()
    d.setDate(d.getDate() + 10)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    expect(isWithinExpirationRange(`${day}/${month}/${year}`)).toBe(false)
  })

  it('returns true when expired 3 days ago (within -5 window)', () => {
    const d = new Date()
    d.setDate(d.getDate() - 3)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    expect(isWithinExpirationRange(`${day}/${month}/${year}`)).toBe(true)
  })
})

describe('sortMembersData', () => {
  const makeMember = (name: string, rawEndDate: string | null) => ({
    id: name,
    name,
    email: null,
    phone: null,
    notes: null,
    status: 'active' as const,
    startDate: null,
    endDate: null,
    rawEndDate,
    isInactive: false,
  })

  it('sorts by name ascending', () => {
    const members = [makeMember('Carlos', null), makeMember('Ana', null), makeMember('Bruno', null)]
    const result = sortMembersData(members, 'name', 'asc')
    expect(result.map(m => m.name)).toEqual(['Ana', 'Bruno', 'Carlos'])
  })

  it('sorts by name descending', () => {
    const members = [makeMember('Carlos', null), makeMember('Ana', null), makeMember('Bruno', null)]
    const result = sortMembersData(members, 'name', 'desc')
    expect(result.map(m => m.name)).toEqual(['Carlos', 'Bruno', 'Ana'])
  })

  it('sorts by endDate ascending with null dates going to end', () => {
    const members = [
      makeMember('Carlos', null),
      makeMember('Ana', '2026-01-01T00:00:00.000Z'),
      makeMember('Bruno', '2025-06-15T00:00:00.000Z'),
    ]
    const result = sortMembersData(members, 'endDate', 'asc')
    expect(result.map(m => m.name)).toEqual(['Bruno', 'Ana', 'Carlos'])
  })
})
