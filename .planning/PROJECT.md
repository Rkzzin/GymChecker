# GymChecker v2

## What This Is

GymChecker is a gym management admin panel for a single operator (the owner's mother). It handles member CRUD, memberships, payments, plans, RFID-based physical access control, and real-time access monitoring. This v2 rebuild modernizes the UI, improves code quality, adds alerts and reporting — while keeping the system lean and focused.

## Core Value

The gym operator can manage her gym from one screen without needing to think about the tool.

## Requirements

### Validated

- ✓ Member management (create, edit, archive, restore) — existing
- ✓ Membership / subscription tracking with plans — existing
- ✓ Payment records (view, edit) — existing
- ✓ Plan management (create, edit, deactivate) — existing
- ✓ RFID-based physical access control via hardware API — existing
- ✓ Real-time access log monitoring with audio notification — existing
- ✓ Supabase auth (login/logout, session guard) — existing
- ✓ Dark mode toggle — existing (to be replaced by light-first design)

### Active

- [ ] Light theme UI — clean, polished, professional; replaces dark mode as the default (dark mode removed or deprioritized)
- [ ] Redesigned component library — better spacing, typography, consistent shadcn/ui usage throughout
- [ ] Data-dense layout — everything visible at a glance, minimal navigation needed
- [ ] Streamlined workflows — fewer clicks for common tasks (renew member, record payment, check-in)
- [ ] In-app notifications — expiring memberships, denied access alerts, surfaced without needing to navigate
- [ ] WhatsApp/SMS notifications — urgent alerts sent to operator's phone (expiring soon, denied access)
- [ ] Better dashboard reporting — cleaner charts, real insights (revenue trends, member growth, retention)
- [ ] Data export — download member list, payment history, or reports as spreadsheet (CSV)
- [ ] Test suite — cover utils, hooks, and API routes; establish baseline coverage
- [ ] Fix `/api/get-pending-tag` missing auth — currently unauthenticated endpoint

### Out of Scope

- Member self-service portal — members viewing/renewing their own memberships (no need, single-operator gym)
- Multi-location support — one gym, one system
- Mobile app — web admin panel is sufficient for the use case
- Role-based permissions — single operator, no staff management needed

## Context

- **Existing codebase**: Full Next.js 15 + Supabase monolith with 6 admin modules (dashboard, members, memberships, payments, plans, monitoring). See `.planning/codebase/` for full analysis.
- **Primary user**: Non-technical gym owner (the developer's mother). UX must be intuitive — no training assumed.
- **RFID hardware integration**: External physical device polls `/api/check-access` and `/api/get-pending-tag`. These contracts must not break.
- **Known debt**: Dark mode implemented via ternary strings in every component (~50% of component complexity). No tests. `alert()`/`confirm()` dialogs throughout. All data loaded client-side (no pagination). Both Chart.js and Recharts imported.
- **Language**: UI is in Portuguese (pt-BR). Comments and labels should remain in Portuguese.

## Constraints

- **Tech stack**: Next.js + React + TypeScript + Supabase — keep the stack, modernize usage patterns
- **RFID API contracts**: `/api/check-access` and `/api/get-pending-tag` request/response formats must stay compatible with the physical hardware
- **Database schema**: Supabase tables (`customer`, `subscription`, `plan`, `payment`, `access_logs`, `pending_tags`) must be preserved — changing schema requires migration strategy
- **Single operator**: No multi-user or permission system needed; keep it simple

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Light theme as default (remove dark mode) | User is non-technical, light theme is more approachable; dark mode ternary strings are a major maintenance burden | — Pending |
| Keep Next.js + Supabase stack | Proven in production, RFID integration works, no reason to change the foundation | — Pending |
| Notifications via WhatsApp/SMS | Operator won't always have the app open; needs alerts on her phone for urgent situations | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after initialization*
