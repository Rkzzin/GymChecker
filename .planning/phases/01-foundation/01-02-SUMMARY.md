---
phase: 01-foundation
plan: 02
subsystem: api, testing, ui
tags: [vitest, recharts, chart.js, bearer-auth, rfid, payments, dashboard]

# Dependency graph
requires:
  - phase: 01-foundation-01-01
    provides: Vitest test infrastructure, API route handler tests with vi.hoisted mocking pattern

provides:
  - Bearer token auth on /api/get-pending-tag (SEC-01) with rfid_uid:null 401 response preserving hardware contract
  - Dynamic year filter in PaymentsToolbar computed from getFullYear()
  - 4 Recharts chart components replacing Chart.js (RevenueChart, SalesChart, PaymentMethodChart, PlansChart)
  - chart.js and react-chartjs-2 fully removed from project
  - SEC-01 auth tests active (5 API tests for get-pending-tag)

affects: [01-foundation-01-03, 01-foundation-01-04, dashboard, payments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bearer token auth pattern mirroring check-access: API_SECRET + GET(request: Request) + authHeader comparison"
    - "Recharts pattern: ResponsiveContainer wrapping BarChart/LineChart/PieChart with semantic fill colors"
    - "Dynamic year list: Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 3 + i)"

key-files:
  created: []
  modified:
    - src/app/api/get-pending-tag/route.ts
    - tests/api/get-pending-tag.test.ts
    - src/app/(admin)/payments/components/PaymentsToolbar.tsx
    - src/app/(admin)/dashboard/components/RevenueChart.tsx
    - src/app/(admin)/dashboard/components/SalesChart.tsx
    - src/app/(admin)/dashboard/components/PaymentMethodChart.tsx
    - src/app/(admin)/dashboard/components/PlansChart.tsx
    - src/app/(admin)/dashboard/page.tsx
    - package.json

key-decisions:
  - "401 response for get-pending-tag uses { rfid_uid: null } not { allowed: false } to preserve RFID hardware polling contract"
  - "darkMode prop removed from all 4 chart components; dashboard/page.tsx retains useTheme for non-chart elements (full sweep deferred to Plan 03)"
  - "chart.js and react-chartjs-2 fully uninstalled; Recharts is now sole chart library"

patterns-established:
  - "SEC-01 auth pattern: const API_SECRET = process.env.API_SECRET_TOKEN + request.headers.get('authorization') comparison"
  - "Recharts responsive wrapper: ResponsiveContainer width='100%' height='100%' inside a sized div"

requirements-completed: [SEC-01, QUAL-03, QUAL-04]

# Metrics
duration: 10min
completed: 2026-03-31
---

# Phase 01 Plan 02: Security Hardening and Chart.js Removal Summary

**Bearer token auth added to RFID get-pending-tag endpoint, year filter made dynamic, and Chart.js fully replaced by Recharts across all 4 dashboard charts**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-31T20:49:00Z
- **Completed:** 2026-03-31T20:51:55Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- SEC-01: `/api/get-pending-tag` now requires Bearer token auth, returns `{ rfid_uid: null }` with HTTP 401 on failure — hardware contract preserved, 5 API tests active (including 2 new auth tests, 0 .todo stubs)
- QUAL-03: PaymentsToolbar year filter uses `Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 3 + i)` — self-updating yearly, no hardcoded array
- QUAL-04: All 4 chart components rewritten with Recharts; `chart.js` and `react-chartjs-2` uninstalled; `darkMode` prop removed from chart signatures and dashboard page usages

## Task Commits

1. **Task 1: Bearer token auth on get-pending-tag (SEC-01)** - `54fb794` (feat)
2. **Task 2: Dynamic year filter and Recharts migration (QUAL-03, QUAL-04)** - `cea2a31` (feat)

## Files Created/Modified

- `src/app/api/get-pending-tag/route.ts` - Added API_SECRET constant, `GET(request: Request)` signature, auth check block returning `{ rfid_uid: null }` on 401
- `tests/api/get-pending-tag.test.ts` - Converted it.todo to active test, added wrong-token test, updated existing tests with Bearer token header
- `src/app/(admin)/payments/components/PaymentsToolbar.tsx` - Year array replaced with getFullYear() computation
- `src/app/(admin)/dashboard/components/RevenueChart.tsx` - Full rewrite: Recharts BarChart replacing Chart.js Bar; darkMode removed
- `src/app/(admin)/dashboard/components/SalesChart.tsx` - Full rewrite: Recharts LineChart replacing Chart.js Line; darkMode removed
- `src/app/(admin)/dashboard/components/PaymentMethodChart.tsx` - Full rewrite: Recharts PieChart replacing Chart.js Pie; darkMode removed
- `src/app/(admin)/dashboard/components/PlansChart.tsx` - Full rewrite: Recharts PieChart replacing Chart.js Doughnut; darkMode removed
- `src/app/(admin)/dashboard/page.tsx` - Removed darkMode prop from all 4 chart component usages
- `package.json` + `package-lock.json` - chart.js and react-chartjs-2 removed

## Decisions Made

- The 401 response body for get-pending-tag uses `{ rfid_uid: null }` (not `{ allowed: false }`) — the RFID hardware polls this endpoint and expects the `rfid_uid` key regardless of response status
- `useTheme` and `darkMode` remain in `dashboard/page.tsx` for non-chart elements (cardClass, text styling); full dark mode sweep is deferred to Plan 03 as planned
- Recharts PieChart with `innerRadius="55%"` provides a donut appearance matching the original Chart.js Doughnut components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Hardware coordination required before deploying SEC-01 to production.** The RFID hardware must be reconfigured to send `Authorization: Bearer <API_SECRET_TOKEN>` on all requests to `/api/get-pending-tag`. Until the hardware is updated, it will receive 401 responses and RFID tag enrollment will not function. Coordinate with hardware owner before deploying.

## Next Phase Readiness

- Foundation plan 02 complete; all tests passing (32/32)
- Plan 03 (dark mode removal sweep) can begin — chart components no longer carry darkMode props, reducing scope
- SEC-01 is fully implemented and tested; hardware coordination is a deployment concern, not a code concern

---
*Phase: 01-foundation*
*Completed: 2026-03-31*
