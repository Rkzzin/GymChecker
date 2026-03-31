import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set env vars inside vi.hoisted so they are available when the route module is evaluated
const { mockMaybeSingle, mockFrom } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  process.env.API_SECRET_TOKEN = 'test-secret'

  const mockMaybeSingle = vi.fn()
  const mockEq = vi.fn().mockReturnThis()
  const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
  const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    delete: mockDelete,
  })
  return { mockMaybeSingle, mockFrom }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

import { GET } from '@/app/api/get-pending-tag/route'

describe('GET /api/get-pending-tag', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset()
  })

  it('returns { rfid_uid: null } when no pending tag exists', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const req = new Request('http://localhost/api/get-pending-tag', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const body = await res.json()
    expect(body).toEqual({ rfid_uid: null })
  })

  it('returns { rfid_uid: string } when a pending tag exists', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: '1', rfid_uid: 'ABC123' },
      error: null,
    })
    const req = new Request('http://localhost/api/get-pending-tag', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const body = await res.json()
    expect(body.rfid_uid).toBe('ABC123')
  })

  it('returns { rfid_uid: null } when Supabase errors', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'err' } })
    const req = new Request('http://localhost/api/get-pending-tag', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const body = await res.json()
    expect(body).toEqual({ rfid_uid: null })
  })

  it('returns 401 when Bearer token is missing', async () => {
    const req = new Request('http://localhost/api/get-pending-tag')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ rfid_uid: null })
  })

  it('returns 401 when Bearer token is wrong', async () => {
    const req = new Request('http://localhost/api/get-pending-tag', {
      headers: { Authorization: 'Bearer wrong-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
