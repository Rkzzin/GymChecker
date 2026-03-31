---
phase: 01-foundation
plan: 03
subsystem: ui-feedback
tags: [sonner, alert-dialog, toast, badges, members]
dependency_graph:
  requires: [01-01]
  provides: [toast-feedback, alert-dialog-confirm, status-badges]
  affects: [members, memberships, payments, plans, layout]
tech_stack:
  added: [sonner@2.0.7, "@radix-ui/react-alert-dialog (via shadcn)"]
  patterns: [sonner-toast, shadcn-alert-dialog, pending-state-confirm]
key_files:
  created:
    - src/components/ui/alert-dialog.tsx
  modified:
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/members/hooks/useMembers.ts
    - src/app/(admin)/members/page.tsx
    - src/app/(admin)/members/components/CreateMemberModal.tsx
    - src/app/(admin)/members/components/EditMemberModal.tsx
    - src/app/(admin)/members/components/RenewMemberModal.tsx
    - src/app/(admin)/members/components/MembersTable.tsx
    - src/app/(admin)/plans/hooks/usePlans.ts
    - src/app/(admin)/memberships/hooks/useMemberships.ts
    - src/app/(admin)/memberships/components/EditMembershipModal.tsx
    - src/app/(admin)/memberships/page.tsx
    - src/app/(admin)/payments/components/EditPaymentModal.tsx
decisions:
  - "Used pending-state pattern (pendingArchiveMember, pendingDeleteMembershipId) to bridge synchronous confirm() to async AlertDialog component — clean separation between hook logic and UI"
  - "Handled useMemberships confirm() (bare confirm, not window.confirm) as equivalent to window.confirm — both are browser native dialogs that must be replaced"
metrics:
  duration: ~15 minutes
  completed: 2026-03-31
  tasks_completed: 2
  files_modified: 12
---

# Phase 01 Plan 03: Sonner Toasts + AlertDialog + Status Badges Summary

**One-liner:** Replaced all 13 alert() + 2 confirm() browser dialogs with sonner toasts and shadcn/ui AlertDialog; added green/amber/red status badges to MembersTable.

## What Was Built

### Task 1: Install sonner + AlertDialog, add Toaster to layout, replace all alert()/confirm() calls (UI-03)

- Installed `sonner@^2.0.7` as a production dependency
- Added `shadcn/ui AlertDialog` component to `src/components/ui/alert-dialog.tsx` via `npx shadcn@latest add alert-dialog`
- Added `<Toaster position="top-right" richColors />` to `AdminContent` in `src/app/(admin)/layout.tsx`
- Replaced 12 `alert()` calls across 8 files with `toast.error()` or `toast.warning()` from sonner
- Replaced `window.confirm()` in `useMembers.ts` with a pending-state AlertDialog pattern — `pendingArchiveMember` state, `confirmArchiveMember()`, and `cancelArchive()` exported from the hook; AlertDialog rendered in `members/page.tsx`
- Replaced `confirm()` in `useMemberships.ts` with the same pattern — `pendingDeleteMembershipId`, `confirmDeleteMembership()`, `cancelDeleteMembership()` exported; AlertDialog rendered in `memberships/page.tsx`
- Added success toast on successful archive/restore and membership delete

### Task 2: Add color-coded member status badges to MembersTable (UI-02) and verify renewal workflow (UI-04)

- Replaced the old `INATIVO` badge + `VENCE EM BREVE` pulsing text in the Vencimento column with three consistent color-coded badges:
  - **Red** (`bg-red-100 text-red-800`) — "Expirado" when `isInactive === true`
  - **Amber** (`bg-amber-100 text-amber-800`) — "Expirando" when `isWithinExpirationRange(endDate) === true`
  - **Green** (`bg-green-100 text-green-800`) — "Ativo" for healthy active members
- Date shown below badge in `text-muted-foreground` for reference
- Removed `animate-pulse` class, `INATIVO` text, and `VENCE EM BREVE` text
- RENOVAR button preserved on each active row — renewal workflow remains 3 clicks or fewer (UI-04)

## Verification

| Check | Result |
|-------|--------|
| `grep -rn "alert(" src/` | 0 results |
| `grep -rn "window.confirm(" src/` | 0 results |
| `grep -rn "confirm(" src/` | 0 results |
| MembersTable contains "Ativo" + `bg-green-100` | Pass |
| MembersTable contains "Expirando" + `bg-amber-100` | Pass |
| MembersTable contains "Expirado" + `bg-red-100` | Pass |
| MembersTable does NOT contain `animate-pulse` | Pass |
| MembersTable does NOT contain `VENCE EM BREVE` | Pass |
| MembersTable does NOT contain `INATIVO` | Pass |
| layout.tsx contains `import { Toaster } from 'sonner'` | Pass |
| layout.tsx contains `<Toaster` | Pass |
| `npx vitest run` | 4 test files, 32 tests — all passed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing replacement] Replaced bare `confirm()` in useMemberships.ts**
- **Found during:** Task 1
- **Issue:** `useMemberships.ts` line 85 used `confirm("Tem certeza que deseja excluir este registro de matrícula?")` — a bare `confirm()` call not listed in the plan's interface section (which only listed the `alert()` at line 91)
- **Fix:** Applied the same pending-state AlertDialog pattern as for `window.confirm()` in `useMembers.ts`. Added `pendingDeleteMembershipId`, `confirmDeleteMembership()`, `cancelDeleteMembership()` to the hook and rendered AlertDialog in `memberships/page.tsx`
- **Files modified:** `src/app/(admin)/memberships/hooks/useMemberships.ts`, `src/app/(admin)/memberships/page.tsx`
- **Commits:** 8fcb63f

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 8fcb63f | feat(01-03): install sonner + AlertDialog, replace all alert()/confirm() calls (UI-03) |
| Task 2 | 36bb411 | feat(01-03): add color-coded member status badges to MembersTable (UI-02) |

## Known Stubs

None. All badge logic uses real data (`m.isInactive`, `isWithinExpirationRange(m.endDate)`) from the existing member data flow. All toast messages are triggered by real error/success events.

## Self-Check: PASSED
