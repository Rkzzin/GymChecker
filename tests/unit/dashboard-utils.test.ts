import { describe, it, expect } from 'vitest'
import { formatCurrency, getMonthlyData, getPaymentMethodsData, getPlansData } from '@/app/(admin)/dashboard/utils'
import type { Payment, Subscription } from '@/app/(admin)/dashboard/types'

describe('formatCurrency', () => {
  it('formats 100 as R$ 100,00', () => {
    const result = formatCurrency(100)
    expect(result).toContain('100')
    expect(result).toContain('R$')
  })

  it('formats 1234.5 as BRL string with proper separators', () => {
    const result = formatCurrency(1234.5)
    expect(result).toContain('1.234')
    expect(result).toContain('50')
    expect(result).toContain('R$')
  })
})

describe('getMonthlyData', () => {
  const payments: Payment[] = [
    { id: '1', amount: 100, payment_date: '2026-01-15', method: 'pix' },
    { id: '2', amount: 200, payment_date: '2026-01-20', method: 'dinheiro' },
    { id: '3', amount: 150, payment_date: '2026-03-10', method: 'pix' },
    { id: '4', amount: 50, payment_date: '2025-01-05', method: 'pix' }, // different year
  ]

  it('returns 12-element array', () => {
    const result = getMonthlyData(payments, 2026, 'revenue')
    expect(result).toHaveLength(12)
  })

  it('aggregates revenue for given year correctly', () => {
    const result = getMonthlyData(payments, 2026, 'revenue')
    expect(result[0]).toBe(300) // January 2026: 100 + 200
    expect(result[2]).toBe(150) // March 2026: 150
    expect(result[1]).toBe(0)   // February 2026: 0
  })

  it('aggregates count for given year correctly', () => {
    const result = getMonthlyData(payments, 2026, 'count')
    expect(result[0]).toBe(2) // January 2026: 2 payments
    expect(result[2]).toBe(1) // March 2026: 1 payment
  })

  it('returns all zeros for year with no payments', () => {
    const result = getMonthlyData(payments, 2020, 'revenue')
    expect(result.every(v => v === 0)).toBe(true)
  })
})

describe('getPaymentMethodsData', () => {
  const payments: Payment[] = [
    { id: '1', amount: 100, payment_date: '2026-02-01', method: 'pix' },
    { id: '2', amount: 50, payment_date: '2026-02-10', method: 'pix' },
    { id: '3', amount: 200, payment_date: '2026-02-15', method: 'dinheiro' },
    { id: '4', amount: 75, payment_date: '2026-02-20', method: null as unknown as string },
  ]

  it('groups by method and capitalizes first letter', () => {
    const result = getPaymentMethodsData(payments, 2026)
    expect(result.labels).toContain('Pix')
    expect(result.labels).toContain('Dinheiro')
  })

  it('uses "Outros" for null method', () => {
    const result = getPaymentMethodsData(payments, 2026)
    expect(result.labels).toContain('Outros')
  })

  it('sums amounts per method correctly', () => {
    const result = getPaymentMethodsData(payments, 2026)
    const pixIndex = result.labels.indexOf('Pix')
    expect(result.data[pixIndex]).toBe(150) // 100 + 50
  })
})

describe('getPlansData', () => {
  const subscriptions: Subscription[] = [
    { id: '1', customer_id: 'c1', start_date: '2026-01-01', end_date: '2026-02-01', created_at: '2026-01-01', plan: { name: 'Mensal' } },
    { id: '2', customer_id: 'c2', start_date: '2026-03-01', end_date: '2026-04-01', created_at: '2026-03-01', plan: { name: 'Mensal' } },
    { id: '3', customer_id: 'c3', start_date: '2026-05-01', end_date: '2026-08-01', created_at: '2026-05-01', plan: { name: 'Trimestral' } },
    { id: '4', customer_id: 'c4', start_date: '2025-01-01', end_date: '2025-02-01', created_at: '2025-01-01', plan: { name: 'Mensal' } }, // different year
  ]

  it('counts subscriptions per plan name for given year', () => {
    const result = getPlansData(subscriptions, 2026)
    const mensalIndex = result.labels.indexOf('Mensal')
    const trimestralIndex = result.labels.indexOf('Trimestral')
    expect(result.data[mensalIndex]).toBe(2)
    expect(result.data[trimestralIndex]).toBe(1)
  })

  it('excludes subscriptions from other years', () => {
    const result = getPlansData(subscriptions, 2026)
    // Only 3 subscriptions in 2026 (not the 2025 one)
    expect(result.data.reduce((sum, v) => sum + v, 0)).toBe(3)
  })
})
