# 02 — Módulos CRUD administrativos (members, memberships, payments, plans)

Scope: `src/app/(admin)/{members,memberships,payments,plans}/` plus the shared
admin shell (`src/app/(admin)/layout.tsx`) and shared components
(`src/components/AppHeader.tsx`, `src/components/ui/button.tsx`,
`src/components/ui/card.tsx`). README.md was intentionally ignored per
instructions. All claims below are backed by file:line citations from the
actual source.

Note on shared UI primitives: none of the four CRUD modules actually import
`src/components/ui/button.tsx` or `src/components/ui/card.tsx` — every module
hand-rolls its own `<button>`/`<div>` markup with inline Tailwind classes
(see "Cross-cutting observations" below). Those shadcn primitives exist in the
repo but are unused by these modules.

---

## Shared admin shell

### `src/app/(admin)/layout.tsx`
- `AdminLayout` (`layout.tsx:33-43`) wraps all admin routes: calls
  `useAuthGuard()` (`layout.tsx:35`) for route protection, then wraps children
  in `ThemeProvider` (`layout.tsx:38`) and an inner `AdminContent` component.
- `AdminContent` (`layout.tsx:9-31`) renders `<AppHeader/>` (`layout.tsx:17`),
  then `{children}` (the page content, `layout.tsx:20`), then a static footer
  (`layout.tsx:22-28`). Background/text color classes are switched by
  `darkMode` from `useTheme()` (`layout.tsx:10,12-13`).
- No data fetching, no CRUD logic lives here — purely structural/theme shell.

### `src/components/AppHeader.tsx`
- Renders nav links to `/monitoring`, `/dashboard`, `/members`,
  `/memberships`, `/plans`, `/payments` (`AppHeader.tsx:32-37`), highlighting
  the active route via `usePathname()` (`AppHeader.tsx:9,17-18`).
- Dark-mode toggle button calls `toggleDarkMode()` from `useTheme()`
  (`AppHeader.tsx:8,40-45`).

### `src/components/ui/button.tsx`, `src/components/ui/card.tsx`
- Standard shadcn-style primitives (`Button` with `cva` variant/size, `Card`/
  `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`).
  Grepping the four modules' imports shows **none of them import from
  `@/components/ui/button` or `@/components/ui/card`** — confirmed by reading
  every import block in members/memberships/payments/plans page/component
  files (none reference `components/ui`). These primitives are dead weight
  for this feature set even though the app has shadcn set up.

---

## Module: Members (`src/app/(admin)/members/`)

### Data model — `types.ts`
- `Plan` (`members/types.ts:1-6`): `id`, `name`, `price: number`,
  `duration_days: number`. A **local, module-scoped duplicate** of the plan
  shape (see Duplication section) — not imported from the `plans` module.
- `MemberWithMembership` (`members/types.ts:8-21`): `id`, `name`,
  `email: string|null`, `phone: string|null`, `notes: string|null`,
  `rfid_uid?: string|null`, `status: 'active'|'archived'`,
  `startDate: string|null` (display, pt-BR formatted), `endDate: string|null`
  (display), `rawEndDate: string|null` (ISO, for date math/inputs),
  `isInactive: boolean` (derived), `lastPlanName?: string`,
  `lastPlanId?: string`. This is a **denormalized view model** combining a
  `customer` row with its most recent `subscription`/`plan`, not a raw table
  row.

### Hook — `hooks/useMembers.ts`
- Hits Supabase table `customer` (`useMembers.ts:57`) joined with
  `subscription (id, start_date, end_date, plan (id, name))`
  (`useMembers.ts:58-61`), filtered by `.eq('status', view)`
  (`useMembers.ts:62`) where `view` is `'active'|'archived'`
  (`useMembers.ts:20`).
- Also independently fetches table `plan` (`useMembers.ts:43`) filtered
  `is_active = true`, ordered by price, into local `plans` state — used to
  populate plan dropdowns in Create/Renew modals.
- State managed: `sortedMembers`, `plans`, `loading`, `loadingPlans`
  (`useMembers.ts:11-14`), UI state (`searchQuery`, `sortCriteria`,
  `sortDirection`, `view`) (`useMembers.ts:17-20`), three modal open-flags
  + `memberToEdit`/`memberToRenew` (`useMembers.ts:23-28`).
- Loading/error pattern: `setLoading(true)` → `try { await supabase... } catch
  (error) { console.error(...) } finally { setLoading(false) }`
  (`useMembers.ts:53-97`) — errors are only logged to console, not surfaced to
  UI state (no `error` state field returned to the page).
- Post-fetch, each `customer` row is reduced to its latest subscription by
  sorting `subscription` array by `end_date` desc and taking `[0]`
  (`useMembers.ts:68-71`), then mapped into `MemberWithMembership` shape
  (`useMembers.ts:73-87`), including calling `isInactiveMoreThan5Days`
  (util) at map time (`useMembers.ts:84`).
- `handleArchiveMember` (`useMembers.ts:107-119`) does an `UPDATE customer SET
  status = ...` toggling active/archived, gated by a `window.confirm(...)`
  (`useMembers.ts:111`), and optimistically removes the row from local state
  on success (`useMembers.ts:114`) rather than refetching.
- `openEditModal`/`openRenewModal` (`useMembers.ts:121-136`) just stage local
  state for modals; no network call until the modal submits.
- Client-side filtering by name substring happens on every render via
  `sortedMembers.filter(...)` (`useMembers.ts:138-140`), not a DB query.

### Page composition — `page.tsx`
- `Members()` (`members/page.tsx:10-72`) composes: `MembersToolbar` (search +
  view toggle + "new member" button), `MembersTable` (sortable table with
  edit/renew/archive actions), and three modals: `CreateMemberModal`,
  `EditMemberModal`, `RenewMemberModal` — all driven purely by state/handlers
  returned from `useMembers()` (`members/page.tsx:11-22`).
- **CreateMemberModal** (`components/CreateMemberModal.tsx`): on submit
  (`CreateMemberModal.tsx:50-109`) performs **3 sequential inserts**:
  1. `INSERT INTO customer` (`CreateMemberModal.tsx:59-69`),
  2. `INSERT INTO subscription` using the new customer id + selected plan,
     computing `end_date = start_date + plan.duration_days`
     (`CreateMemberModal.tsx:73-85`),
  3. `INSERT INTO payment` for the initial payment (`CreateMemberModal.tsx:89-96`,
     fire-and-forget, error not checked).
  Also has an RFID "capture tag" button that calls `GET
  /api/get-pending-tag` (`CreateMemberModal.tsx:24-42`) to prefill
  `rfid_uid` from a hardware reader.
- **EditMemberModal**: single `UPDATE customer SET name, email, phone, notes,
  rfid_uid WHERE id=...` (`EditMemberModal.tsx:58-67`). Same RFID-capture
  button pattern duplicated (`EditMemberModal.tsx:33-50`).
- **RenewMemberModal**: computes new subscription dates from either today or
  the member's existing `rawEndDate` if not inactive (`RenewMemberModal.tsx:43-49`),
  then does **2 inserts**: `INSERT INTO subscription`
  (`RenewMemberModal.tsx:71-76`) and `INSERT INTO payment`
  (`RenewMemberModal.tsx:80-87`) — same create+payment pattern as
  CreateMemberModal but without creating a new customer.
- None of the three write paths use a DB transaction/RPC — multi-step
  inserts are sequential client calls with only `try/catch` + `alert()` on
  failure (e.g. `CreateMemberModal.tsx:104-105`), so a mid-sequence failure
  can leave orphaned rows (e.g. customer created but subscription/payment
  failed).

### Utils — `utils.ts`
- `isInactiveMoreThan5Days(endDateIso)` (`members/utils.ts:4-11`): true if
  `now - end > 5 days`.
- `isWithinExpirationRange(endDateStr)` (`members/utils.ts:14-23`): parses a
  `DD/MM/YYYY` display string, true if the member is due within
  `[-5, +3]` days of today — drives the "VENCE EM BREVE" (expiring soon) UI
  badge.
- `sortMembersData(data, field, dir)` (`members/utils.ts:26-47`): custom
  comparator handling `endDate`/`startDate` (parsed to timestamps, missing
  dates pushed to start/end depending on direction) vs. default name
  `localeCompare`.

---

## Module: Memberships (`src/app/(admin)/memberships/`)

This module has **no `utils.ts`** — confirmed absent from the directory
listing (only `types.ts`, `page.tsx`, `hooks/useMemberships.ts`,
`components/{MembersList,MembershipsToolbar,EditMembershipModal}.tsx`).

### Data model — `types.ts`
- `Member` (`memberships/types.ts:1-4`): `id`, `name` — a minimal shape, not
  the same as members module's `MemberWithMembership`.
- `Membership` (`memberships/types.ts:6-15`): `id`, `memberId`,
  `startDate`/`endDate` (display, DD/MM/YYYY), `rawStartDate`/`rawEndDate`
  (ISO), `planName: string`, `price: number`. This is a subscription-row view
  model, denormalized with the plan's name/price flattened in.
- `MembershipToEdit` (`memberships/types.ts:18-19`) extends `Membership` with
  `memberName: string`, used only to label the edit modal.

### Hook — `hooks/useMemberships.ts`
- `fetchMembers()` (`useMemberships.ts:33-36`) hits table `customer`,
  `select('id, name')`, ordered by name — populates the left-hand member list.
- `fetchMembershipsForMember(memberId)` (`useMemberships.ts:38-70`) hits table
  `subscription` filtered `.eq('customer_id', memberId)`, joined with `plan
  (name, price)` (`useMemberships.ts:41-45`), ordered by `end_date` desc; maps
  rows into the `Membership` shape (`useMemberships.ts:49-58`). This is
  fetched **on demand** (lazy, per-member, when the accordion row is
  expanded) rather than all-at-once.
- State: `members`, `memberships` (flat array across all expanded members)
  (`useMemberships.ts:8-9`), `openMemberships`/`loadingMemberships` keyed by
  member id (`useMemberships.ts:13-14`), modal state (`useMemberships.ts:18-19`).
- Loading pattern is per-member-keyed: `setLoadingMemberships(prev => ({
  ...prev, [memberId]: true }))` (`useMemberships.ts:39`) rather than one
  global boolean like the members module. Errors: `console.error` only, no
  UI error state (`useMemberships.ts:65-66`).
- `toggleMemberships(memberId)` (`useMemberships.ts:73-77`): expands/collapses
  a member's history row, triggering `fetchMembershipsForMember` only on
  first open (lazy fetch pattern, distinct from members/payments/plans which
  eagerly fetch everything).
- `handleDeleteMembership(id)` (`useMemberships.ts:84-93`): `DELETE FROM
  subscription WHERE id=...` gated by `confirm(...)`, optimistically filters
  local `memberships` state.
- `onEditSuccess(memberId)` (`useMemberships.ts:96-98`): re-fetches only that
  member's memberships after an edit — targeted refresh rather than full
  reload.

### Page composition — `page.tsx`
- `Memberships()` (`memberships/page.tsx:11-57`) composes: `MembershipsToolbar`
  (search only, no create button — this module has **no "create membership"
  path**; new memberships/subscriptions are only created via Members'
  Create/Renew modals), `MembersList` (accordion of members, each expandable
  to show a nested table of subscription history), and `EditMembershipModal`.
- **MembersList** (`components/MembersList.tsx`): per member, a toggle button
  ("Ver Histórico"/"Fechar Histórico", `MembersList.tsx:35-44`); when open,
  renders a nested `<table>` of that member's memberships filtered from the
  flat `memberships` array by `memberId` (`MembersList.tsx:62`), with per-row
  Edit (✏️) and Delete (🗑️) buttons (`MembersList.tsx:74-88`).
- **EditMembershipModal**: only edits `start_date`/`end_date` — `UPDATE
  subscription SET start_date, end_date WHERE id=...`
  (`EditMembershipModal.tsx:33-39`). Cannot change plan or amount.
- CRUD surface for this module is therefore: **Read** (list members + lazy
  per-member subscription history), **Update** (dates only), **Delete**
  (subscription row) — no **Create** here.

### Utils
- None (`utils.ts` absent). No formatting/computation helpers exist in this
  module; date formatting is done inline in the hook
  (`useMemberships.ts:52-53`) with `toLocaleDateString('pt-BR', {timeZone:
  'UTC'})`.

---

## Module: Payments (`src/app/(admin)/payments/`)

### Data model — `types.ts`
- `Payment` (`payments/types.ts:1-7`): `id`, `amount: number`,
  `payment_date: string`, `method: string`, `notes: string|null`,
  `customer: { name: string }` — a nested join shape (Supabase embedded
  select), i.e. **Payment references a customer/member via the embedded
  `customer.name` object**, confirmed by the query in the hook (below). No
  `customer_id`/`subscription_id` fields are present in this type even
  though the DB rows have them (see cross-module note).

### Hook — `hooks/usePayments.ts`
- `fetchPayments()` (`usePayments.ts:11-36`) hits table `payment`,
  `select('id, amount, payment_date, method, notes, customer (name)')`
  (`usePayments.ts:22-24`) — confirms the FK join to `customer`. Filtered by
  a computed month range: `.gte('payment_date', startDate).lt('payment_date',
  endDate)` (`usePayments.ts:25-26`) built from `monthFilter`/`yearFilter`
  state (`usePayments.ts:8-9,14-20`), ordered by `payment_date` desc.
- State: `payments`, `loading`, `monthFilter`, `yearFilter`
  (`usePayments.ts:6-9`). Loading pattern identical shape to members:
  `setLoading(true)/try/catch(console.error)/finally setLoading(false)`
  (`usePayments.ts:12-35`).
- `updatePayment(id, updates)` (`usePayments.ts:38-42`): `UPDATE payment SET
  ...updates WHERE id=...`, then **refetches the whole list**
  (`await fetchPayments()`) rather than patching local state optimistically
  — different pattern from members/memberships which mutate local arrays
  directly.
- `useEffect` re-runs `fetchPayments` whenever `monthFilter`/`yearFilter`
  change (`usePayments.ts:44`), i.e. filtering is server-side (query
  re-issued), unlike Members' client-side search filter.

### Page composition — `page.tsx`
- `PaymentsPage()` (`payments/page.tsx:10-55`) computes `totalMonth` by
  reducing the currently-loaded `payments` array client-side
  (`payments/page.tsx:17`), composes `PaymentsToolbar` (total + month/year
  selects), `PaymentsTable` (list with per-row Edit), and conditionally
  renders `EditPaymentModal` when both `isEditModalOpen` and `paymentToEdit`
  are set (`payments/page.tsx:45-52`).
- CRUD surface: **Read** (filtered by month/year) and **Update** (amount,
  date, method, notes) only. **No Create or Delete** UI exists in this
  module — new payments are only created indirectly via the Members module's
  Create/Renew modals inserting into `payment`.
- **EditPaymentModal**: builds `safeDate = ${date}T12:00:00.000Z` to avoid
  timezone rollover (`EditPaymentModal.tsx:47`), then calls the hook's
  `onUpdate(payment.id, {amount, payment_date, method, notes})`
  (`EditPaymentModal.tsx:49-54`).

### Utils — `utils.ts`
- `formatCurrency(value)` (`payments/utils.ts:1-2`): `Intl`/`toLocaleString`
  BRL currency formatting — **byte-for-byte identical** to `plans/utils.ts:1-2`
  (see Duplication).
- `getMethodBadgeClass(method)` (`payments/utils.ts:4-11`): switch on
  lowercased payment method (`pix`/`dinheiro`/`transferencia`/default) →
  Tailwind badge color classes.

---

## Module: Plans (`src/app/(admin)/plans/`)

### Data model — `types.ts`
- `Plan` (`plans/types.ts:1-6`): `id`, `name`, `price: number`,
  `duration_days: number`, `is_active: boolean`. This is the **canonical**
  Plan shape (matches the actual `plan` table columns used across the app,
  including `is_active` which the members-module's local `Plan` type omits).

### Hook — `hooks/usePlans.ts`
- `fetchPlans()` (`usePlans.ts:9-25`) hits table `plan`,
  `select('*')`, ordered `is_active` desc then `price` asc
  (`usePlans.ts:12-16`) — i.e. active plans surface first, unlike Members'
  hook which explicitly filters `is_active = true` only.
- `savePlan(planData, id?)` (`usePlans.ts:27-49`): a single function handling
  both create and update — if `id` is passed, does `UPDATE plan SET
  ...planData WHERE id=id` (`usePlans.ts:29-35`); otherwise `INSERT INTO plan
  {...planData, is_active: true}` (`usePlans.ts:37-41`). Both paths refetch
  the whole list afterward (`usePlans.ts:44`). This "upsert-by-presence-of-id"
  pattern is unique to this module — members/payments/memberships each have
  separate distinct handlers or modals per operation instead.
- `toggleStatus(plan)` (`usePlans.ts:51-65`): `UPDATE plan SET is_active =
  !is_active WHERE id=...`, with optimistic local state update
  (`usePlans.ts:60`) — this is Plans' analogue of "soft delete/archive" (same
  idea as Members' `handleArchiveMember`, but a boolean flag instead of an
  enum status).
- State: `plans`, `loading` only (`usePlans.ts:6-7`) — no search/sort/filter
  UI state (this module has none of that in the UI either).

### Page composition — `page.tsx`
- `PlansPage()` (`plans/page.tsx:9-36`) composes just two pieces: `PlanForm`
  (a combined create/edit form, always visible at top) and `PlansTable`
  (list with per-row Edit + toggle-active). No modal dialogs are used in this
  module — `PlanForm` is an inline form, not an overlay
  (`PlanForm.tsx:52-85`), unlike every other module's create/edit flows which
  use fixed-position modal overlays (`fixed inset-0 bg-black/60 ...`).
- **PlanForm**: `editingPlan` prop switches the form between create and edit
  mode (`PlanForm.tsx:17-28`); on submit calls `onSave(data, editingPlan?.id)`
  (`PlanForm.tsx:35-39`), delegating the create-vs-update branching to the
  hook's `savePlan`.
- **PlansTable**: renders rows with Edit (sets `editingPlan` state in the
  page, scrolling focus to `PlanForm`) and a toggle button (🚫/✅) calling
  `onToggleStatus` (`PlansTable.tsx:47-50`). No delete button/action exists
  anywhere in this module — plans are only deactivated, never deleted.

### Utils — `utils.ts`
- `formatCurrency(value)` (`plans/utils.ts:1-2`): identical to
  `payments/utils.ts:1-2`.
- `getStatusBadgeClass(isActive)` (`plans/utils.ts:4-7`): boolean → green/red
  Tailwind badge classes — structurally the same pattern as payments'
  `getMethodBadgeClass` (string-switch → badge classes) but keyed on a
  boolean instead of an enum string.

---

## Verified cross-module relationships

All of these are confirmed directly from `select()`/`insert()` calls, not
inferred from naming:

1. **Payment → Customer (Member)**: `payment` table has an embedded/joined
   `customer (name)` relation, confirmed by `usePayments.ts:24`
   (`select('..., customer (name)')`) and the resulting `Payment.customer:
   {name: string}` field (`payments/types.ts:7`). Inserts confirm the FK is
   `customer_id`: `CreateMemberModal.tsx:90` and
   `RenewMemberModal.tsx:81` both insert `payment` rows with `customer_id:
   ...`.
2. **Payment → Subscription (Membership)**: inserts of `payment` also set
   `subscription_id` (`CreateMemberModal.tsx:91`, `RenewMemberModal.tsx:82`),
   linking a payment to the specific membership/subscription it paid for.
   This field is **not** exposed in `payments/types.ts`'s `Payment` interface
   or read back anywhere in the payments module — it's write-only from the
   members module's perspective.
3. **Membership (subscription) → Customer (Member)**: `subscription` rows
   carry `customer_id` (used to filter in `useMemberships.ts:44` — `.eq
   ('customer_id', memberId)` — and set on insert in
   `CreateMemberModal.tsx:80`, `RenewMemberModal.tsx:72`). The
   `memberships/types.ts` `Membership.memberId` field maps to this column
   (`useMemberships.ts:51`, `sub.customer_id`).
4. **Membership (subscription) → Plan**: `subscription` rows carry
   `plan_id`, set on insert (`CreateMemberModal.tsx:81`,
   `RenewMemberModal.tsx:73`) and read via embedded join
   `plan (id, name)` in `useMembers.ts:60` and `plan (name, price)` in
   `useMemberships.ts:43`. Confirms Membership → Plan is a real FK, and both
   the members and memberships hooks independently join through it to
   denormalize plan name/price onto their view models.
5. **Member (Members module) ↔ Member (Memberships module)**: both modules
   read from the same `customer` table (`useMembers.ts:57`,
   `useMemberships.ts:34`) but define **separate, non-shared** local
   `Member`/`MemberWithMembership` types (`memberships/types.ts:1-4` vs.
   `members/types.ts:8-21`) — there is no shared `Member` type imported
   across modules; each module re-declares its own view of the same table.

No relationship exists in code between **Plans** and **Payments** directly
(Plan price is only propagated into a Payment's `amount` at insert time, as
a snapshotted number — `CreateMemberModal.tsx:92`, `RenewMemberModal.tsx:83`
— there's no `plan_id` on `payment`).

---

## Cross-cutting patterns, duplication, and architecture notes

**Each module independently reimplements the same CRUD skeleton** — there is
no shared base hook, no shared CRUD abstraction, no shared modal/table
component. Concretely:

- **Structural duplication**: every module follows the same
  `types.ts` + `hooks/useXxx.ts` (state + Supabase calls) + `page.tsx`
  (composition root) + `components/{Toolbar,Table,*Modal}.tsx` layout, but
  each hook independently reimplements `useState`/`useEffect`/
  `try-catch-finally` fetch boilerplate from scratch (compare
  `useMembers.ts:53-97`, `useMemberships.ts:38-70`, `usePayments.ts:11-36`,
  `usePlans.ts:9-25` — four near-identical but hand-written
  loading/try/catch/finally blocks with no shared helper).
- **Duplicated `formatCurrency`**: byte-identical function defined separately
  in `payments/utils.ts:1-2` and `plans/utils.ts:1-2`. Not shared via a
  common `lib/` util despite being pure and identical.
- **Duplicated `Plan` type**: `members/types.ts:1-6` re-declares a `Plan`
  interface (missing `is_active`) instead of importing the canonical one
  from `plans/types.ts:1-6`.
- **Duplicated badge-class pattern**: `payments/utils.ts:4-11`
  (`getMethodBadgeClass`) and `plans/utils.ts:4-7`
  (`getStatusBadgeClass`) both implement "value → Tailwind badge class
  string" with the same shape, independently.
- **Duplicated RFID-capture logic**: `CreateMemberModal.tsx:24-42` and
  `EditMemberModal.tsx:33-50` contain near-identical `capturarTag` functions
  (fetch `/api/get-pending-tag`, set `rfid_uid`, alert on miss) — copy-pasted
  rather than extracted into a shared hook/component.
- **Inconsistent CRUD completeness per module**: Members has full
  Create/Read/Update/Archive(soft-delete); Memberships has
  Read/Update/Delete but no Create; Payments has Read/Update only (no
  Create/Delete UI — creation is a side effect of Members actions); Plans has
  Create/Read/Update/soft-Deactivate but no hard Delete. This is a real
  product-level inconsistency, not just styling — e.g. there is no way to
  delete a payment from the UI, and no way to create a standalone
  membership without also touching the Members module.
- **Inconsistent error handling/UX**: all hooks swallow Supabase errors with
  `console.error` and either silently no-op (members archive shows an
  `alert`, memberships delete shows a generic `alert`, payments/plans show
  no user-facing error at all on fetch failure) — there's no shared error
  state or toast/notification system; each modal's submit handler wraps its
  own `alert(...)` ad hoc (e.g. `CreateMemberModal.tsx:104-105`,
  `EditMemberModal.tsx:72-73`, `RenewMemberModal.tsx:93-94`,
  `EditMembershipModal.tsx:45-46`, `EditPaymentModal.tsx:57-59`).
- **Inconsistent state-update-after-write strategy**: Members/Memberships
  mutate local arrays optimistically after a write
  (`useMembers.ts:114`, `useMemberships.ts:89`, `usePlans.ts:60`); Payments
  instead does a full refetch after every update (`usePayments.ts:41`) —
  three different strategies for "keep UI in sync after a mutation" across
  four modules.
- **Modal vs. inline form inconsistency**: Members/Memberships/Payments all
  use fixed-position overlay modals (`fixed inset-0 bg-black/60 ...` pattern,
  e.g. `CreateMemberModal.tsx:118`, `EditMembershipModal.tsx:58`,
  `EditPaymentModal.tsx:71`) for create/edit; Plans instead uses an
  always-visible inline form (`PlanForm.tsx:52`) with no overlay — a
  structural inconsistency in interaction pattern between otherwise
  parallel modules.
- **No shared table/toolbar component**: `MembersTable`, `PaymentsTable`,
  `PlansTable`, and the nested table in `MembersList` each redefine their own
  `<table>` markup, header styling classes, loading/empty states, and
  hover/dark-mode class strings independently (e.g. loading row markup is
  copy-pasted near-verbatim across `MembersTable.tsx:56-57`,
  `PaymentsTable.tsx:30-31`, `PlansTable.tsx:30-31`), rather than sharing a
  generic table/skeleton component. Likewise none of the modules use the
  `Card`/`CardHeader`/etc. primitives already available in
  `src/components/ui/card.tsx` — dark/light card styling is reimplemented
  ad hoc as string-concatenated Tailwind classes in every module
  (`darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'`
  appears near-identically in `MembersToolbar.tsx:22`,
  `MembersTable.tsx:31`, `PaymentsToolbar.tsx:15`, `PaymentsTable.tsx:14`,
  `PlansTable.tsx:15`, `PlanForm.tsx:50`, `EditMembershipModal.tsx:54`, and
  more).

**Overall**: the four modules are not built on a shared CRUD/data-fetching
abstraction — they are four parallel, independently hand-authored
implementations of the same page/hook/table/modal shape, with meaningful
copy-paste duplication (currency formatting, badge-class switches, RFID
capture, loading/error boilerplate, dark-mode class strings) and several
inconsistencies (which CRUD operations exist per module, modal-vs-inline
forms, optimistic-update-vs-refetch) that a later architecture review should
flag as candidates for a shared `useSupabaseCrud`/table/modal abstraction.
