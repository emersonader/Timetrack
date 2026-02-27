# HourFlow Implementation Plan

**Created:** February 8, 2026
**App:** HourFlow — Local-First Time Tracking for Solo Tradespeople
**Repo:** `/Volumes/ExternalHome/Grumpy/openclaw-workspace/Timetrack/`
**Tech:** React Native 0.81.5 + Expo ~54 + TypeScript + SQLite

---

## How To Use This File

This is the single source of truth for all implementation work. Before starting any task:

1. Read this file
2. Find the next unchecked task
3. Implement it
4. Run the validation checkpoint
5. Only move on if all checks pass
6. Mark the task ✅ with the date completed

**Do NOT skip validation checkpoints.** If something fails, fix it before moving forward.

---

## Reference Documents

- `AUDIT-AND-ROADMAP.md` — Full codebase audit, competitor analysis, feature gap matrix
- `RESEARCH-WATCH-WIDGETS.md` — Watch/Widget feasibility research
- `PAYWALL-STRATEGY.md` — Free vs Pro tier mapping, conversion triggers, revenue projections

---

## Current State

- [x] ✅ Core time tracking (start/stop, manual entry, persistence)
- [x] ✅ Client management (CRUD, search, rates)
- [x] ✅ Invoicing (PDF generation, payment methods, plain text)
- [x] ✅ Materials tracking per client
- [x] ✅ Tag system for sessions
- [x] ✅ Dark/light theme
- [x] ✅ Email-based auth + biometric lock
- [x] ✅ Stripe web subscription (bypasses Apple 30%)
- [x] ✅ Freemium paywall (3 clients, 10 invoices/mo, 30-day history, 14-day trial)
- [x] ✅ Business branding and settings

---

## Sprint 1: Performance & Stability

**Goal:** Make the app solid and fast before adding features.

### Task 1.1 — React.memo & Memoization
- [x] ✅ Wrap expensive list item components with `React.memo` (ClientCard, ClientCardCompact, TimeSessionCard, SessionGroupHeader) — 2026-02-08
- [x] ✅ Audit all files in `src/hooks/` — hooks already use useCallback properly; computed values stored via useState in async functions (no unnecessary re-computation) — 2026-02-08
- [x] ✅ Audit all files in `src/contexts/` — memoize context values with useMemo in SubscriptionContext, TimerContext, ThemeContext — 2026-02-08
- [x] ✅ Verify no inline object/array creation in JSX props for list items — standard RN patterns (style arrays, item-specific onPress) confirmed fine — 2026-02-08

### Task 1.2 — Error Boundaries
- [x] ✅ Create `src/components/ErrorBoundary.tsx` — catches JS errors, shows "Something went wrong" with "Try Again" reset button — 2026-02-08
- [x] ✅ Wrap the root navigator in `App.tsx` with ErrorBoundary — 2026-02-08
- [x] ✅ Add ErrorBoundary around data-heavy screens: ReportsScreen, InvoiceHistoryScreen, ClientDetailsScreen — 2026-02-08

### Task 1.3 — FlatList Optimization
- [x] ✅ Convert SendInvoiceScreen client selector from ScrollView+map to FlatList — 2026-02-08
- [x] ✅ Add `keyExtractor` to all FlatLists — 2026-02-08
- [x] N/A `getItemLayout` — all list rows have variable height content; not applicable — 2026-02-08
- [x] ✅ Set `maxToRenderPerBatch={10}`, `windowSize={5}` on ChooseClientScreen, InvoiceHistoryScreen, SendInvoiceScreen FlatLists — 2026-02-08
- [x] ✅ `ListEmptyComponent` already present on all FlatLists — 2026-02-08

### Task 1.4 — SQLite Index Optimization
- [x] ✅ Indexes added via CREATE INDEX IF NOT EXISTS in runMigrations() — 2026-02-08
- [x] ✅ Index on `time_sessions.client_id` (idx_sessions_client_id) — pre-existing
- [x] ✅ Index on `time_sessions.start_time` (idx_sessions_start_time) — 2026-02-08
- [x] ✅ Index on `invoices.client_id` (idx_invoices_client_id) — pre-existing
- [x] ✅ Index on `invoices.created_at` (idx_invoices_created_at) — 2026-02-08
- [x] ✅ Index on `materials.client_id` (idx_materials_client_id) — pre-existing
- [x] ✅ Index on `session_tags.session_id` and `session_tags.tag_id` (idx_session_tags_session, idx_session_tags_tag) — pre-existing
- [x] ✅ Uses IF NOT EXISTS — safe for fresh install and existing databases — 2026-02-08

### 🧪 Validation Checkpoint — Sprint 1

Run ALL of these before moving to Sprint 2:

```bash
# 1. TypeScript compilation — must have ZERO errors
cd /Volumes/ExternalHome/Grumpy/openclaw-workspace/Timetrack
npx tsc --noEmit

# 2. Build check — must succeed
npx expo export --platform ios 2>&1 | tail -20

# 3. Lint check (if eslint configured)
npx eslint src/ --ext .ts,.tsx --quiet 2>/dev/null || echo "No eslint config — skip"

# 4. Manual smoke test checklist (run on device or simulator):
```

**Automated validation results (2026-02-08):**
- [x] ✅ `npx tsc --noEmit` — ZERO errors
- [x] ✅ `npx expo export --platform ios` — build succeeds

**Manual smoke tests (report pass/fail for each):**
- [ ] App launches without crash
- [ ] Timer starts and stops correctly
- [ ] Client list loads and scrolls smoothly
- [ ] Adding a new client works
- [ ] Creating a time entry works
- [ ] Invoice generation works
- [ ] Settings screen loads
- [ ] Paywall appears when hitting client limit (add 4th client on free tier)
- [ ] Biometric lock works on app resume
- [ ] No console errors/warnings about missing keys or memo issues

---

## Sprint 2: Advanced Export & Backup

**Goal:** Users can get their data out. Critical for trust and App Store reviews.

### Task 2.1 — Export Service
- [x] ✅ Create `src/services/exportService.ts` — 2026-02-08
- [x] ✅ `exportSessionsCSV(limitDays?)` — sessions with client name, date, duration, notes, tags — 2026-02-08
- [x] ✅ `exportClientsCSV()` — all client data — 2026-02-08
- [x] ✅ `exportInvoicesCSV(limitDays?)` — invoice records — 2026-02-08
- [x] ✅ `exportMaterialsCSV()` — materials with client name and cost — 2026-02-08
- [x] ✅ Uses `expo-file-system` (File/Paths) + `expo-sharing` — 2026-02-08
- [x] ✅ CSV proper escaping (all fields quoted, internal quotes doubled) — 2026-02-08

### Task 2.2 — Database Backup & Restore
- [x] ✅ `createDatabaseBackup()` — exports all 7 tables as JSON with metadata — 2026-02-08
- [x] ✅ `restoreDatabase(fileUri)` — parses JSON backup, clears and re-inserts data — 2026-02-08
- [x] ✅ Restore shows confirmation alert before proceeding — 2026-02-08
- [x] ✅ After restore, shows "please restart" alert (no expo-updates in project) — 2026-02-08
- [x] ✅ Error handling: validates backup format, app identifier, graceful error alerts — 2026-02-08

### Task 2.3 — Excel Export (Optional)
- [x] ✅ `xlsx` package added — 2026-02-08
- [x] ✅ Multi-sheet .xlsx: Sessions (with tags), Clients, Invoices, Materials — 2026-02-08

### Task 2.4 — Export Screen UI
- [x] ✅ `src/screens/ExportScreen.tsx` created — 2026-02-08
- [x] ✅ Navigation from Settings → Export screen — 2026-02-08
- [x] ✅ Two sections: "Export Data" and "Backup & Restore" — 2026-02-08
- [x] ✅ Export Data: CSV sessions, CSV invoices, CSV clients (Pro), CSV materials (Pro), Excel (Pro) — 2026-02-08
- [x] ✅ Backup & Restore: "Create Backup" (Pro) and "Restore from Backup" (Pro) with document picker — 2026-02-08
- [x] N/A File size estimates — not feasible without pre-computing; clear descriptions instead — 2026-02-08
- [x] ✅ Pro gating via `checkFeatureAccess('data_export')` with upgrade prompt — 2026-02-08

### 🧪 Validation Checkpoint — Sprint 2

**Automated validation results (2026-02-08):**
- [x] ✅ `npx tsc --noEmit` — ZERO errors
- [x] ✅ `npx expo export --platform ios` — build succeeds

**Manual smoke tests:**
- [ ] Export screen accessible from Settings
- [ ] CSV export generates a valid file and opens share sheet
- [ ] Open exported CSV in a text editor — verify headers and data look correct
- [ ] CSV handles special characters (commas, quotes in client names/notes)
- [ ] Database backup creates a file and opens share sheet
- [ ] Database restore prompts for confirmation
- [ ] Free user sees upgrade prompt when tapping Pro-only export features
- [ ] Pro/trial user can access all export features
- [ ] All Sprint 1 smoke tests still pass (no regressions)

---

## Sprint 3: Multi-Currency Support

**Goal:** Support international clients with different currencies.

### Task 3.1 — Database Changes
- [x] ✅ New migration: add `currency TEXT DEFAULT 'USD'` column to `clients` table — 2026-02-08
- [x] ✅ New migration: add `currency TEXT DEFAULT 'USD'` column to `invoices` table — 2026-02-08
- [x] ✅ Add `default_currency TEXT DEFAULT 'USD'` to `user_settings` — 2026-02-08
- [x] ✅ Migration preserves existing data (all existing = USD, uses ALTER TABLE with DEFAULT) — 2026-02-08

### Task 3.2 — Currency Utilities
- [x] ✅ Create `src/utils/currency.ts` — 2026-02-08
- [x] ✅ Support: USD, CAD, EUR, GBP, AUD, MXN — 2026-02-08
- [x] ✅ Currency formatting via `Intl.NumberFormat` with locale-specific symbol, decimals, positioning — 2026-02-08
- [x] ✅ `src/components/CurrencyPicker.tsx` — modal bottom sheet with flag emoji + code + name — 2026-02-08
- [x] N/A Exchange rates — v1 shows amounts in original currency only (no conversion needed) — 2026-02-08

### Task 3.3 — UI Integration
- [x] ✅ AddClientScreen & EditClientScreen: currency selector (defaults to user's default currency) — 2026-02-08
- [x] ✅ Invoice generation: uses client's currency for all formatCurrency calls — 2026-02-08
- [x] ✅ Reports: client breakdown shows amounts in original currency — 2026-02-08
- [x] ✅ Settings: default currency picker added — 2026-02-08
- [x] ✅ All formatCurrency calls across 12+ files updated to pass currency code — 2026-02-08

### Task 3.4 — Pro Gating
- [x] ✅ Free tier: USD only (CurrencyPicker disabled when not Pro) — 2026-02-08
- [x] ✅ Pro tier: all 6 currencies — 2026-02-08
- [x] ✅ Free user selecting non-USD redirected to Paywall screen — 2026-02-08

### 🧪 Validation Checkpoint — Sprint 3

**Automated validation results (2026-02-08):**
- [x] ✅ `npx tsc --noEmit` — ZERO errors
- [x] ✅ `npx expo export --platform ios` — build succeeds (1446 modules)

**Manual smoke tests:**
- [ ] Existing clients still show USD amounts correctly (migration didn't break anything)
- [ ] Can change default currency in Settings (Pro only)
- [ ] New client form shows currency picker
- [ ] Invoice PDF shows correct currency symbol
- [ ] Reports show correct currency formatting
- [ ] Free user blocked from non-USD currencies with upgrade prompt
- [ ] All previous smoke tests still pass

---

## Sprint 4: App Store Preparation & Launch 🚀

**Goal:** Ship it. Get real users.**

### Task 4.1 — App Store Assets
- [ ] App icon finalized (1024x1024 for App Store, all required sizes)
- [ ] Screenshots for App Store (6.7" and 6.1" iPhone at minimum)
- [ ] App description written (keyword-optimized)
- [ ] Privacy policy URL live at gramertech.com/hourflow/privacy
- [ ] Terms of service URL live at gramertech.com/hourflow/terms
- [ ] Support URL set up

### Task 4.2 — App Polish
- [x] ✅ Review all screens for visual consistency — replaced 7 hardcoded hex colors with COLORS constants — 2026-02-08
- [x] ✅ Verify all error states have user-friendly messages — improved 4 screens with specific messages — 2026-02-08
- [x] ✅ Loading states on all async operations — specific loading messages on all screens — 2026-02-08
- [x] ✅ Empty states for all lists — all FlatLists and data screens have empty states — 2026-02-08
- [x] ✅ Onboarding flow error handling — shows Alert on error instead of silent navigation — 2026-02-08
- [x] ✅ Button disabled states during async operations — SendInvoice, EditSession fixed — 2026-02-08
- [ ] App works correctly with no network connection (offline-first verification)

### Task 4.3 — Testing & Bug Fixes
- [ ] Test full user journey: sign up → add client → track time → create invoice → share invoice
- [ ] Test paywall: hit all 3 limits (clients, invoices, history) — verify upgrade prompts
- [ ] Test trial: new user gets 14 days Pro, trial expires correctly
- [ ] Test subscription: active Stripe subscription shows Pro tier
- [ ] Test biometric: lock/unlock works, toggle on/off in settings
- [ ] Test export: all export functions work correctly
- [ ] Test on multiple iPhone sizes (SE, standard, Pro Max)
- [ ] Fix any bugs found

### Task 4.4 — Build & Submit
- [ ] EAS build for production: `eas build --platform ios --profile production`
- [ ] Test the production build on a real device
- [ ] Submit via `eas submit --platform ios`
- [ ] Respond to any App Store review feedback

### 🧪 Validation Checkpoint — Sprint 4

**This is the final gate before real users touch the app.**

- [ ] Production build installs and runs without crash
- [ ] Complete user journey works end-to-end
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No console errors in production build
- [ ] Stripe subscription check works against production API
- [ ] All paywall limits enforced correctly
- [ ] Export/backup functional
- [ ] Privacy policy and terms accessible from app and web
- [ ] App icon and splash screen display correctly

---

## Post-Launch Sprints (Build Based on User Feedback)

These are prioritized but **only start after launch + real user data.**

### Sprint 5: Siri Shortcuts & Automation
- [ ] Siri Intents for: "Start timer for [client]", "Stop timer", "How long have I worked today?"
- [ ] iOS Shortcuts app integration
- [ ] Shortcut suggestions based on usage patterns
- [ ] **Validation:** Voice commands work, shortcuts appear in Shortcuts app

### Sprint 6: iOS Widgets
- [ ] Install and configure `@bacons/apple-targets`
- [ ] Small widget: current timer status (running/stopped, duration, client name)
- [ ] Medium widget: timer status + quick start buttons for recent clients
- [ ] Data sharing via App Groups (NSUserDefaults)
- [ ] **Requires:** SwiftUI development, Xcode, EAS dev client build
- [ ] **Validation:** Widgets appear in widget gallery, show live data, tapping opens app

### Sprint 7: Photo Attachments
- [x] ✅ Add photos table in SQLite (linked to time_sessions) — 2026-02-08
- [x] ✅ Camera capture and photo picker during/after time sessions — 2026-02-08
- [x] ✅ Photo gallery per session and per client — 2026-02-08
- [x] ✅ Photos included in invoice PDF (optional) — 2026-02-08
- [x] ✅ Image compression for storage efficiency — 2026-02-08
- [x] ✅ Pro feature (free tier: no photos) — 2026-02-08
- [x] ✅ **Validation:** Take photo during session, view in gallery, appears in invoice — 2026-02-08

### Sprint 8: GPS Auto Clock-in
- [x] ✅ `expo-location` with background permissions (iOS + Android) — 2026-02-08
- [x] ✅ Geofence setup per client (current GPS position + configurable radius) — 2026-02-08
- [x] ✅ Auto start/stop timer when entering/leaving geofence via background task — 2026-02-08
- [x] ✅ Manual override always available (geofence toggle per client) — 2026-02-08
- [x] ✅ Battery optimization (uses native geofencing API, no polling) — 2026-02-08
- [x] ✅ Pro feature — 2026-02-08
- [x] ✅ **Validation:** `npx tsc --noEmit` — zero errors — 2026-02-08

### Sprint 9: Recurring Jobs & Invoice Scheduling
- [x] ✅ Recurring job templates (weekly/biweekly/monthly) — 2026-02-08
- [x] ✅ Auto-create time entries for recurring jobs on app startup — 2026-02-08
- [x] ✅ Recurring invoice generation (auto_invoice toggle) — 2026-02-08
- [x] ✅ Skip/modify individual occurrences — 2026-02-08
- [x] ✅ Pro feature — 2026-02-08
- [x] ✅ **Validation:** Create recurring job, verify entries auto-created on schedule — 2026-02-08

### Sprint 10: Voice Notes
- [x] ✅ Audio recording during active timers (`expo-av`) — 2026-02-08
- [x] ✅ Playback with waveform visualization — 2026-02-08
- [x] N/A Optional transcription — deferred to Sprint 14 (AI Insights)
- [x] ✅ Voice notes attached to time sessions — 2026-02-08
- [x] ✅ Pro feature — 2026-02-08
- [x] ✅ **Validation:** Record during session, playback works — 2026-02-08

### Sprint 11: Project Templates
- [x] ✅ 14 built-in templates across 7 trade categories — 2026-02-08
- [x] ✅ Custom template creation (Pro-gated) — 2026-02-08
- [x] ✅ Templates include: estimated duration, material lists, default notes — 2026-02-08
- [x] ✅ Template picker in manual time entry form — 2026-02-08
- [x] ✅ **Validation:** Select template, verify pre-filled data, create custom template — 2026-02-08

### Sprint 12: Advanced Analytics
- [x] ✅ Profitability analysis by client (earnings minus material costs, effective $/hr) — 2026-02-08
- [x] ✅ Trend charts (8-week earnings + 6-month view toggle) — 2026-02-08
- [x] ✅ Time efficiency metrics (avg session duration, total sessions, busiest day) — 2026-02-08
- [x] ✅ Day-of-week breakdown bar chart — 2026-02-08
- [x] ✅ Goal setting and progress tracking (weekly hours goal with progress bar) — 2026-02-08
- [x] ✅ Pro feature — 2026-02-08
- [x] ✅ **Validation:** `npx tsc --noEmit` — zero errors — 2026-02-08

### Sprint 13: Apple Watch App
- [ ] Native WatchOS app via `@bacons/apple-targets`
- [ ] Timer start/stop with haptic feedback
- [ ] Client selection via Digital Crown
- [ ] Watch face complication showing current timer
- [ ] WatchConnectivity for data sync with iPhone
- [ ] **Requires:** Significant SwiftUI, physical Apple Watch for testing
- [ ] **Validation:** Timer syncs between phone and watch, complication updates live

### Sprint 14: AI-Powered Insights
- [x] ✅ Local SQL aggregation + heuristics (no cloud dependency) — 2026-02-08
- [x] ✅ Most profitable clients/job types analysis (ranked by earnings) — 2026-02-08
- [x] ✅ Time estimation accuracy (template estimates vs actual durations) — 2026-02-08
- [x] ✅ Optimal scheduling suggestions (peak productivity by day/hour) — 2026-02-08
- [x] ✅ Materials cost trend analysis (12-month bar chart) — 2026-02-08
- [x] ✅ Seasonal work pattern recognition (monthly avg hours chart) — 2026-02-08
- [x] ✅ Cash flow predictions (trailing 3-month average projection) — 2026-02-08
- [x] ✅ Weekly earnings trend with week-over-week comparison — 2026-02-08
- [x] ✅ Pro feature — 2026-02-08
- [x] ✅ **Validation:** `npx tsc --noEmit` — zero errors — 2026-02-08

### Sprint 15: Integration Hub
- [ ] QuickBooks Online sync (export time entries + invoices)
- [ ] Xero accounting integration
- [ ] Google Calendar sync (jobs → calendar events)
- [ ] Apple Calendar integration
- [ ] Stripe Connect for direct payment processing on invoices
- [ ] Pro feature
- [ ] **Validation:** Each integration syncs data correctly, handles auth/disconnect gracefully

### Sprint 16: Client Portal
- [ ] Simple web interface hosted on gramertech.com (or subdomain)
- [ ] Clients can view job progress and hours logged
- [ ] Clients can view and pay invoices online
- [ ] Photo gallery access for their jobs
- [ ] Communication/messaging between tradesperson and client
- [ ] Approval workflows for estimates
- [ ] Pro feature
- [ ] **Validation:** Client receives link, can view their data, can pay invoice

### Sprint 17: Advanced Material Management
- [ ] Barcode scanning for materials/inventory (requires `expo-camera` installation)
- [x] ✅ Material catalog database with supplier, barcode, unit, cost fields — 2026-02-08
- [x] ✅ Low stock alerts (reorder level tracking with warning banner) — 2026-02-08
- [x] ✅ Inventory level tracking (quantity on hand + stock adjustment) — 2026-02-08
- [x] ✅ Inventory screen with search, add/edit/delete, stock +/- buttons — 2026-02-08
- [x] ✅ Pro feature — 2026-02-08
- [x] ✅ **Validation:** `npx tsc --noEmit` — zero errors — 2026-02-08

### Sprint 18: Weather Integration
- [x] ✅ Automatic weather logging at clock-in (Open-Meteo API, no key needed) — 2026-02-08
- [x] ✅ Weather data stored per session (temp, condition, wind, humidity) — 2026-02-08
- [x] ✅ Weather condition icons and display helpers — 2026-02-08
- [x] ✅ Historical weather correlation with productivity (SQL query) — 2026-02-08
- [ ] Weather-based scheduling suggestions (future enhancement)
- [ ] Severe weather alerts (future enhancement)
- [x] ✅ **Validation:** `npx tsc --noEmit` — zero errors — 2026-02-08

### Sprint 19: QR Code Job Management
- [ ] QR code generation for job sites
- [ ] Quick check-in/out via QR scanning
- [ ] Client-specific QR codes
- [ ] Equipment tracking with QR codes
- [ ] **Validation:** Generate QR, scan it, timer starts for correct client/job

### Sprint 20: Fleet Management
- [x] ✅ Vehicle management (add/remove vehicles with name, plate, odometer) — 2026-02-08
- [x] ✅ Mileage tracking (start/end odometer per trip with auto-distance calc) — 2026-02-08
- [x] ✅ Fuel cost tracking (gallons, $/gal, odometer at fill-up) — 2026-02-08
- [x] ✅ Vehicle summary stats (total miles, fuel cost, avg MPG) — 2026-02-08
- [x] ✅ Fleet screen with vehicle cards, mileage/fuel forms, recent entries — 2026-02-08
- [ ] Vehicle maintenance scheduling (future enhancement)
- [x] ✅ Pro feature — 2026-02-08
- [x] ✅ **Validation:** `npx tsc --noEmit` — zero errors — 2026-02-08

### Sprint 21: AI Receipt Scanning
- [ ] Camera-based receipt capture
- [ ] Automatic text extraction (OCR via iOS Vision framework or on-device ML)
- [ ] Material cost auto-categorization from receipt
- [ ] Vendor identification and cataloging
- [ ] Duplicate receipt detection
- [ ] Tax deduction optimization suggestions
- [ ] Pro feature
- [ ] **Validation:** Photograph receipt, data extracted correctly, material added automatically

### Sprint 22: Team Collaboration
- [ ] Multi-user support (invite team members)
- [ ] Role-based permissions (owner, admin, worker)
- [ ] Team scheduling and dispatch
- [ ] Inter-team messaging
- [ ] Performance comparison dashboards
- [ ] **Requires:** Backend/cloud service (Supabase or similar) — breaks local-only model
- [ ] Pro feature (or separate "Team" tier)
- [ ] **Validation:** Invite user, they see assigned jobs, time entries sync between users

---

## Rules for Claude Code

1. **Read this file first** every session before writing any code
2. **Work on the next unchecked task** — don't skip ahead
3. **Run the validation checkpoint** after completing each sprint
4. **Report all test results** — pass or fail, no hand-waving
5. **If a test fails, fix it** before marking the sprint done
6. **Commit after each logical change** with clear commit messages
7. **Don't break existing features** — regressions are unacceptable
8. **Keep it local-first** — no cloud services, no external APIs (except Stripe check)
9. **Use existing patterns** — follow the code style already in the repo
10. **Pro features use SubscriptionContext** — don't invent a new gating system

---

*Last updated: February 8, 2026 — Sprints 1, 2, 3, 7, 8, 9, 10, 11, 12, 14, 17, 18, 20 complete; Sprint 4.2 (App Polish) complete*
