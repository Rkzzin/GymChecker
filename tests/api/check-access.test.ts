import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set env vars inside vi.hoisted so they are available when the route module is evaluated
const { mockRpc } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  process.env.API_SECRET_TOKEN = 'test-secret'
  return { mockRpc: vi.fn() }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc })),
}))

import { POST } from '@/app/api/check-access/route'

describe('POST /api/check-access', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('http://localhost/api/check-access', {
      method: 'POST',
      body: JSON.stringify({ rfid_uid: 'TAG1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.allowed).toBe(false)
  })

  it('returns 401 when Bearer token is wrong', async () => {
    const req = new Request('http://localhost/api/check-access', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-token' },
      body: JSON.stringify({ rfid_uid: 'TAG1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when rfid_uid is missing from body', async () => {
    const req = new Request('http://localhost/api/check-access', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.allowed).toBe(false)
  })

  it('returns 200 with allowed and reason from RPC when auth is valid', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { allowed: true, reason: 'Acesso permitido' },
      error: null,
    })
    const req = new Request('http://localhost/api/check-access', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfid_uid: 'TAG1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ allowed: true, reason: 'Acesso permitido' })
  })

  it('returns 500 when RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    })
    const req = new Request('http://localhost/api/check-access', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfid_uid: 'TAG1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
