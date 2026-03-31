# GymChecker v2 — Roadmap

**Milestone:** v1.0
**Requirements:** 17
**Phases:** 3

## Phases

- [ ] **Phase 1: Foundation** — Light theme, inline dialogs, status badges, streamlined workflows, code quality cleanup, and security fix
- [ ] **Phase 2: Dashboard, Export & In-App Alerts** — Expiring membership widget, revenue chart, CSV export, and in-app expiry badge
- [ ] **Phase 3: WhatsApp/SMS Notifications** — Twilio-powered expiry and denied-access alerts to operator's phone with deduplication

## Phase Overview

| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 1 | 3/5 | In Progress|  |
| 2 | Dashboard, Export & In-App Alerts | Operator sees key data and can export it without leaving the app | DASH-01, DASH-02, EXPO-01, EXPO-02, EXPO-03, NOTF-01 |
| 3 | WhatsApp/SMS Notifications | Urgent alerts reach the operator's phone automatically | NOTF-02, NOTF-03, NOTF-04 |

## Phase Details

### Phase 1: Foundation

**Goal:** Operator experiences a clean light theme with inline feedback, color-coded member status, streamlined workflows, and the codebase has test coverage and no dark mode debt.
**Depends on:** Nothing (first phase)
**Requirements:** UI-01, UI-02, UI-03, UI-04, SEC-01, QUAL-01, QUAL-02, QUAL-03, QUAL-04

**Success Criteria** (what must be TRUE):
1. Operator sees all 6 modules in a consistent white/gray light theme — no dark backgrounds, no dark mode toggle
2. Every member row shows a color badge indicating active, expiring soon, or expired without any extra navigation
3. All confirmation and error feedback appears as inline UI components — no browser alert() or confirm() popups anywhere in the app
4. Operator can renew a membership and record a payment in 3 clicks or fewer from the member list
5. Both RFID API routes are covered by tests and /api/get-pending-tag validates a Bearer token before responding

**Notes:**
- Remove ThemeProvider and all dark mode ternary strings; migrate module by module and verify visually before moving on
- Remove Chart.js entirely; Recharts (or shadcn/ui Charts) is the sole charting library going forward
- Write Vitest tests for utility functions and both API route handlers before touching the RFID routes
- SEC-01 auth fix: harden /api/get-pending-tag to match the Bearer token pattern already used by /api/check-access
- Dynamic year filter for payments: derive year list from current date, not a hardcoded constant
**Plans:** 3/5 plans executed
**UI hint**: yes

### Phase 2: Dashboard, Export & In-App Alerts

**Goal:** Operator sees expiring memberships and revenue trends on the dashboard, can download member and payment data as CSV, and sees an in-app badge when memberships are about to expire.
**Depends on:** Phase 1
**Requirements:** DASH-01, DASH-02, EXPO-01, EXPO-02, EXPO-03, NOTF-01

**Success Criteria** (what must be TRUE):
1. Dashboard shows a list of members whose membership expires within 7 days, including member name and days remaining
2. Dashboard shows a revenue trend chart comparing the current month to the previous month
3. Operator can click a button on the members page to download a CSV with name, phone, email, plan, status, and expiry date
4. Operator can click a button on the payments page to download a CSV with member name, amount, payment method, and date
5. Downloaded CSV files open in Excel with Portuguese characters (ç, ã, á, etc.) intact — no garbled text
6. A visible badge or widget appears in the app when at least one membership is expiring within 7 days

**Notes:**
- CSV export: client-side via PapaParse from already-loaded state; prepend UTF-8 BOM (0xEF, 0xBB, 0xBF) to every file
- Dashboard data: extend useDashboard hook with a query for subscriptions expiring within 7 days (same pattern as existing queries)
- NOTF-01 in-app badge reuses the same expiring-within-7-days data fetched for DASH-01 — no duplicate queries
**Plans:** TBD
**UI hint**: yes

### Phase 3: WhatsApp/SMS Notifications

**Goal:** Operator automatically receives a WhatsApp or SMS message when a member's membership is close to expiring or when RFID access is denied, with no duplicate sends.
**Depends on:** Phase 2
**Requirements:** NOTF-02, NOTF-03, NOTF-04

**Success Criteria** (what must be TRUE):
1. Operator receives a WhatsApp or SMS message for each member whose membership will expire within 3 days — sent once per expiry cycle, not repeated daily
2. Operator receives a WhatsApp or SMS message each time a member's RFID access is denied
3. System never sends more than one expiry notification per member per expiry cycle — even if the scheduled job runs multiple times

**Notes:**
- Use Twilio official SDK (WhatsApp Business API + SMS fallback); do NOT use unofficial gateways (ban risk)
- Expiry alerts: Supabase Edge Function triggered by pg_cron (daily); add expiry_notification_sent_at to subscription table for idempotency
- Denied-access alerts: Supabase DB webhook on access_logs INSERT filtered to denied=true; throttle to max 1 alert per member per 30 minutes
- Twilio account and WhatsApp Business setup must be confirmed before this phase executes
**Plans:** TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/? | Not started | — |
| 2. Dashboard, Export & In-App Alerts | 0/? | Not started | — |
| 3. WhatsApp/SMS Notifications | 0/? | Not started | — |

---
*Roadmap created: 2026-03-31*
*Milestone: v1.0 GymChecker v2*
