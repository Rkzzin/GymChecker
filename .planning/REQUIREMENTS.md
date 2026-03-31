# Requirements: GymChecker v2

**Defined:** 2026-03-31
**Core Value:** The gym operator can manage her gym from one screen without needing to think about the tool.

## v1 Requirements

### UI & UX

- [ ] **UI-01**: Operator sees all pages in a polished light theme (white/gray backgrounds, dark text, no dark mode)
- [ ] **UI-02**: Operator sees member status (active, expiring soon, expired) indicated by color badges at a glance
- [ ] **UI-03**: Operator sees confirmations and errors as inline UI components (not browser `alert()`/`confirm()` popups)
- [ ] **UI-04**: Operator can complete membership renewal and payment recording in ≤3 clicks from any relevant page

### Security

- [x] **SEC-01**: RFID hardware accessing `/api/get-pending-tag` must authenticate with a Bearer token (same pattern as `/api/check-access`)

### Code Quality

- [x] **QUAL-01**: All pure utility functions have Vitest unit tests (`sortMembersData`, `isInactiveMoreThan5Days`, `formatCurrency`, etc.)
- [x] **QUAL-02**: Both API route handlers (`/api/check-access`, `/api/get-pending-tag`) have tests covering auth validation and response shapes
- [x] **QUAL-03**: Payment year filter shows current year and surrounding years dynamically (not hardcoded list ending at 2026)
- [x] **QUAL-04**: Chart.js removed from project; Recharts is the only chart library

### Dashboard & Reporting

- [ ] **DASH-01**: Operator sees memberships expiring within 7 days listed on the dashboard with member name and days remaining
- [ ] **DASH-02**: Operator sees revenue trend (current month vs. previous month) as a chart on the dashboard

### Data Export

- [ ] **EXPO-01**: Operator can download the member list as a CSV file (name, phone, email, plan, membership status, expiry date)
- [ ] **EXPO-02**: Operator can download payment history as a CSV file (member name, amount, payment method, date)
- [ ] **EXPO-03**: Exported CSV files open in Excel with Portuguese characters (ç, ã, á, etc.) preserved correctly

### Notifications

- [ ] **NOTF-01**: Operator sees an in-app indicator (badge or widget) when memberships are expiring within 7 days
- [ ] **NOTF-02**: Operator receives a WhatsApp/SMS message when a member's membership will expire within 3 days
- [ ] **NOTF-03**: Operator receives a WhatsApp/SMS message when a member's RFID access is denied
- [ ] **NOTF-04**: System sends at most one expiry notification per member per expiry cycle (no duplicate messages)

## v2 Requirements

### UX Enhancements

- **UX2-01**: Operator can configure notification advance window (e.g., 3 days / 5 days / 7 days before expiry)
- **UX2-02**: Dashboard shows member growth trend (new members per month)
- **UX2-03**: Operator can add notes to a denied access event from the monitoring page

### Quality

- **QUAL2-01**: Component tests for modals (create/edit/renew member) using React Testing Library
- **QUAL2-02**: Playwright E2E tests for login → create member → renew flow

## Out of Scope

| Feature | Reason |
|---------|--------|
| Member self-service portal | Single-operator gym, members don't need online access |
| Multi-user / staff roles | One operator, no staff management needed |
| Online payment processing | In-person payments only; no payment gateway needed |
| Automated billing / subscriptions | Owner manually collects fees |
| Email notifications | Operator prefers WhatsApp — excluded by user |
| Dark mode | Being replaced by light theme; dual-theme maintenance not worth it |
| Mobile app | Web admin panel is sufficient; PWA could be added later |
| Complex BI reporting / analytics | Simple charts + CSV export covers the need |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| UI-04 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Complete |
| QUAL-01 | Phase 1 | Complete |
| QUAL-02 | Phase 1 | Complete |
| QUAL-03 | Phase 1 | Complete |
| QUAL-04 | Phase 1 | Complete |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| EXPO-01 | Phase 2 | Pending |
| EXPO-02 | Phase 2 | Pending |
| EXPO-03 | Phase 2 | Pending |
| NOTF-01 | Phase 2 | Pending |
| NOTF-02 | Phase 3 | Pending |
| NOTF-03 | Phase 3 | Pending |
| NOTF-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation*
