# Job Time Tracker - Development Status

**Last Updated:** February 8, 2026

---

## Project Overview

**Job Time Tracker** is a React Native/Expo mobile app for freelancers and contractors to:
- Manage clients with contact info and hourly rates
- Track work time with a live timer (persists across app restarts)
- Track job expenses/materials per client
- Generate and send professional PDF invoices via email/SMS/share
- Configure business profile with logo and payment methods (PayPal, Venmo, Zelle, Cash App, Stripe)

**Tech Stack:**
- React Native 0.81.5 + React 19.1.0
- Expo ~54.0.31
- TypeScript ~5.9.2
- SQLite (expo-sqlite) for offline-first local storage
- Stripe web subscriptions (verified via API)

**Monetization:**
- 14-day free Pro trial with full access
- Free tier: 3 clients, 10 invoices/month, 30-day report history, 5 materials/client, limited features
- Pro tier ($9.99/mo): Unlimited clients, invoices, history, custom branding, PDF export, email invoices

---

## Completed Features

### Core Functionality
- [x] Client CRUD operations (add, edit, delete, search)
- [x] Live timer with background persistence
- [x] Timer notifications while running
- [x] Time session tracking per client
- [x] Manual time entry
- [x] Edit time sessions (adjust start/end times, notes)
- [x] Materials/costs tracking per client
- [x] Invoice generation with PDF
- [x] Send invoices via email, SMS, share
- [x] Auto-attach PDF to email invoices
- [x] Business profile settings (name, address, logo)
- [x] Payment method configuration
- [x] Theme customization (primary/accent colors)

### Subscription System
- [x] Stripe web subscription verification via API
- [x] 14-day free Pro trial (stored in SQLite)
- [x] Feature gating for premium features (clients, invoices, history, materials, branding, PDF, email/SMS)
- [x] Paywall screen with free vs Pro comparison
- [x] Monthly invoice limit (10/month for free tier)
- [x] 30-day report history limit for free tier
- [x] Subscription caching in SQLite with periodic re-verification

### Performance & Stability
- [x] React.memo on list item components (ClientCard, TimeSessionCard)
- [x] useMemo on all Context value objects (Subscription, Timer, Theme)
- [x] React Error Boundary wrapping main navigator
- [x] SQLite performance indexes (updated_at, created_at, start_time)

### Export & Backup
- [x] CSV export for sessions, invoices, clients, and materials
- [x] Excel export with multi-sheet workbook (Sessions, Clients, Invoices, Materials) - Pro only
- [x] Full database backup as JSON (Pro only)
- [x] Database restore from JSON backup with validation (Pro only)
- [x] Export screen accessible from Settings with "Export Data" and "Backup & Restore" sections
- [x] Pro gating on export features via subscription context

### Multi-Currency Support
- [x] 6 currencies supported: USD, CAD, EUR, GBP, AUD, MXN
- [x] Per-client currency selection with CurrencyPicker component (flag emoji + code)
- [x] Locale-aware formatting via Intl.NumberFormat
- [x] Default currency setting in Settings
- [x] All formatCurrency calls throughout app respect client currency
- [x] Free tier: USD only; Pro tier: all currencies
- [x] Database migrations for currency columns on clients, invoices, user_settings

### Recurring Jobs (Pro)
- [x] Recurring job templates (weekly, biweekly, monthly)
- [x] Auto-generate time sessions on app startup
- [x] Optional auto-invoice generation per occurrence
- [x] Occurrence tracking with pending/completed/skipped status
- [x] Skip upcoming occurrences
- [x] Pause/resume recurring jobs
- [x] Idempotent generation with safety cap (100 occurrences per job)
- [x] Day-of-month capped at 28 to avoid edge cases

### Project Templates
- [x] 14 built-in templates across 7 trade categories (plumbing, electrical, HVAC, carpentry, painting, landscaping, general)
- [x] Template materials seeded for relevant templates
- [x] Custom template creation (Pro-gated)
- [x] Template picker in manual time entry form
- [x] Pre-fill duration, notes, and optionally add materials to client
- [x] SectionList grouped by trade category
- [x] Expandable template cards with notes and materials preview

### Advanced Analytics (Pro)
- [x] Weekly hours goal with progress bar and inline editing
- [x] 8-week earnings trend bar chart with toggle to 6-month view
- [x] Client profitability ranking (earnings minus material costs, effective $/hr)
- [x] Time insights: average session duration, total sessions, busiest day of week
- [x] Day-of-week breakdown bar chart with busiest day highlight

### GPS Auto Clock-in (Pro)
- [x] Client geofences with configurable radius (50-5000m)
- [x] Background location monitoring via expo-location geofencing
- [x] Auto-start timer on geofence enter, auto-stop on exit
- [x] Geofence notifications for auto clock-in/out events
- [x] Toggle active/inactive per geofence
- [x] Background task registered via expo-task-manager
- [x] iOS and Android location permissions configured

### AI-Powered Insights (Pro)
- [x] Weekly earnings trend with week-over-week comparison
- [x] Top job types analysis ranked by earnings (by tag)
- [x] Time estimation accuracy (template estimates vs actual durations)
- [x] Peak productivity analysis (earnings/hr by day-of-week and hour)
- [x] Material cost trend (12-month bar chart)
- [x] Cash flow forecast (6-month history + 3-month projection)
- [x] Seasonal work pattern recognition (monthly avg hours)

### Advanced Material Management / Inventory (Pro)
- [x] Material catalog database with supplier, barcode/SKU, unit, cost fields
- [x] Inventory level tracking (quantity on hand + stock adjustment +/-)
- [x] Low stock alerts with reorder level monitoring
- [x] Search catalog by name or barcode
- [x] 8 unit types: each, ft, lb, gal, box, roll, bag, set

### Weather Integration
- [x] Automatic weather logging at clock-in via Open-Meteo API (free, no API key)
- [x] Stores temperature, condition, wind speed, humidity per session
- [x] Weather condition icons and display helpers
- [x] Historical weather correlation with productivity query

### Fleet Management (Pro)
- [x] Vehicle management (add/remove with name, license plate, odometer)
- [x] Mileage tracking (start/end odometer, auto-distance calculation)
- [x] Fuel cost tracking (gallons, $/gal, odometer at fill-up)
- [x] Vehicle summary stats (total miles, fuel cost, avg MPG)

### QR Code Job Management (Pro)
- [x] Generate QR codes for clients with custom labels
- [x] Scan QR codes to quickly clock in to jobs
- [x] QR code list with client association
- [x] Three-tab interface: My QR Codes, Scan, Generate
- [x] Camera-based scanning via expo-camera

### Receipt Scanning (Pro)
- [x] Camera capture for receipt photos
- [x] Photo library import via expo-image-picker
- [x] Receipt detail form: vendor, amount, date, notes, category
- [x] 7 categories: Materials, Fuel, Tools, Office, Travel, Food, Other
- [x] Client association for receipts
- [x] Processed/unprocessed status tracking
- [x] Receipt stats (total count, unprocessed count)

### Calendar & Accounting Integrations (Pro)
- [x] Calendar sync: list available calendars, toggle sync per calendar
- [x] Export sessions as calendar events via expo-calendar
- [x] QuickBooks IIF format export with date range selection
- [x] Xero CSV format export with date range selection
- [x] Coming soon section for Stripe Connect and direct API integrations

### Client Portal (Pro)
- [x] Generate self-contained HTML client progress reports
- [x] Configurable sections: sessions, invoices, materials, photos
- [x] Summary stats: total hours, total billed, session count
- [x] Share via native share sheet (expo-sharing)

### Siri Shortcuts (Service Layer)
- [x] Data preparation functions for Siri integration
- [x] Today summary, recent clients, active timer info
- [x] Available shortcuts definition

### iOS Widgets (Service Layer)
- [x] Widget data aggregation (small, medium widget sizes)
- [x] Timer state, today/week totals, recent clients

### Apple Watch (Service Layer)
- [x] Watch sync data preparation (WatchConnectivity)
- [x] Complication data, client list for watch

### Navigation & UI
- [x] Stack-based navigation with 30 screens
- [x] Home screen with quick actions
- [x] Recent clients display
- [x] Active timer banner on home screen
- [x] Settings screen
- [x] Modal paywall presentation

---

## Recent Changes (February 8, 2026)

### QR Code Job Management (Sprint 19)
Pro-gated QR code system for quick job clock-in via scanning.

1. **New types** (`src/types/index.ts`)
   - Added `QRCodes` route to `RootStackParamList`
   - Added `'qr_codes'` to `PremiumFeature` union
   - Added `QRCode`, `CreateQRCodeInput` interfaces

2. **Database migration** (`src/db/database.ts`)
   - New `qr_codes` table (id, client_id FK CASCADE, label, code_data, created_at)

3. **Repository** (`src/db/qrCodeRepository.ts` — new)
   - CRUD: getAllQRCodes (joined with clients), getQRCodesForClient, getQRCodeById, createQRCode, deleteQRCode, findQRCodeByData

4. **Hook** (`src/hooks/useQRCodes.ts` — new)
   - `useQRCodes()` — manages QR codes with create, delete, refresh

5. **Screen** (`src/screens/QRCodesScreen.tsx` — new)
   - Three tabs: My QR Codes, Scan, Generate
   - QR code display via react-native-qrcode-svg
   - Camera scanning via expo-camera CameraView
   - Pro-gated on mount

**New dependencies:** react-native-svg, react-native-qrcode-svg, expo-camera

### Receipt Scanning (Sprint 21)
Pro-gated receipt capture and management system.

1. **New types** (`src/types/index.ts`)
   - Added `ReceiptScanner` route to `RootStackParamList`
   - Added `'receipt_scanning'` to `PremiumFeature` union
   - Added `Receipt`, `CreateReceiptInput` interfaces

2. **Database migration** (`src/db/database.ts`)
   - New `receipts` table (id, photo_path, vendor_name, total_amount, date, notes, category, client_id, is_processed, created_at)

3. **Repository** (`src/db/receiptRepository.ts` — new)
   - CRUD: getAllReceipts (with client names), getReceiptById, getReceiptsForClient, createReceipt, updateReceipt, deleteReceipt, getReceiptStats

4. **Hook** (`src/hooks/useReceipts.ts` — new)
   - `useReceipts()` — manages receipts with stats, CRUD operations

5. **Screen** (`src/screens/ReceiptScannerScreen.tsx` — new)
   - List, camera, and detail modes
   - Camera capture via CameraView, photo library via ImagePicker
   - Detail form: vendor, amount, date, notes, category picker, client picker
   - File management via new expo-file-system API (File/Directory/Paths)

### Calendar & Accounting Integrations (Sprint 15)
Pro-gated integration hub for calendar sync and accounting exports.

1. **New types** (`src/types/index.ts`)
   - Added `Integrations` route to `RootStackParamList`
   - Added `'integrations'` to `PremiumFeature` union
   - Added `CalendarSyncConfig` interface

2. **Database migration** (`src/db/database.ts`)
   - New `calendar_sync` table (id, calendar_id UNIQUE, calendar_name, sync_enabled, last_synced, created_at)

3. **Service** (`src/services/integrationService.ts` — new)
   - Calendar: requestCalendarPermission, getAvailableCalendars, syncSessionsToCalendar
   - Accounting: exportToQuickBooks (IIF format), exportToXero (CSV format)

4. **Hook** (`src/hooks/useIntegrations.ts` — new)
   - Calendar list, sync toggle, sync operations, export functions

5. **Screen** (`src/screens/IntegrationsScreen.tsx` — new)
   - Calendar Sync card with per-calendar toggles
   - Accounting Export card with date range and QuickBooks/Xero buttons
   - Coming Soon section

**New dependency:** expo-calendar

### Client Portal (Sprint 16)
Pro-gated client-facing progress reports shared via HTML.

1. **New types** (`src/types/index.ts`)
   - Added `ClientPortal: { clientId: number }` route to `RootStackParamList`
   - Added `'client_portal'` to `PremiumFeature` union

2. **Service** (`src/services/clientPortalService.ts` — new)
   - Gathers all client data (sessions, invoices, materials, photos)
   - Generates self-contained HTML report with inline CSS
   - Shares via expo-sharing

3. **Screen** (`src/screens/ClientPortalScreen.tsx` — new)
   - Preview with section toggles (sessions, invoices, materials, photos)
   - "Generate & Share" button

### Siri Shortcuts, iOS Widgets, Apple Watch (Sprints 5, 6, 13)
TypeScript service layers that prepare data for native iOS integrations. Actual native functionality requires Xcode Swift code.

1. **Siri Service** (`src/services/siriService.ts` — new)
   - Available shortcuts definition, today summary, recent clients, active timer info

2. **Widget Service** (`src/services/widgetService.ts` — new)
   - Widget data aggregation for small/medium widget sizes

3. **Watch Service** (`src/services/watchService.ts` — new)
   - Watch sync data, complication data, client list for watch

### GPS Auto Clock-in (Sprint 8)
Pro-gated geofencing feature that automatically starts/stops timers when arriving at or leaving a client's job site.

1. **New types** (`src/types/index.ts`)
   - Added `Geofences` route to `RootStackParamList`
   - Added `'geofencing'` to `PremiumFeature` union
   - Added `ClientGeofence`, `CreateGeofenceInput` interfaces

2. **Database migration** (`src/db/database.ts`)
   - New `client_geofences` table (id, client_id UNIQUE, latitude, longitude, radius, is_active, auto_start, auto_stop, created_at)
   - Foreign key to clients with CASCADE delete
   - Added to `resetDatabase()`

3. **Geofence Repository** (`src/db/geofenceRepository.ts` -- new)
   - CRUD: getActiveGeofences, getAllGeofences, getGeofenceByClientId, upsertGeofence, setGeofenceActive, deleteGeofence
   - Uses INSERT...ON CONFLICT for upsert (one geofence per client)

4. **Geofence Service** (`src/services/geofenceService.ts` -- new)
   - Location permission helpers (foreground + background)
   - `getCurrentLocation()` for saving job site position
   - `startGeofenceMonitoring()` / `stopGeofenceMonitoring()` using expo-location geofencing API
   - Haversine distance calculation for manual geofence checks
   - `checkCurrentGeofenceStatus()` to find which geofence user is inside

5. **Background Task** (`App.tsx`)
   - Registered `HOURFLOW_GEOFENCE_TASK` via `TaskManager.defineTask()` at module scope
   - On geofence enter: checks if timer already running, auto-starts session, shows notification
   - On geofence exit: checks if timer running for that client, auto-stops session, shows notification
   - Geofence monitoring started during app initialization (non-fatal)

6. **Notifications** (`src/services/notificationService.ts`)
   - Added `showGeofenceNotification()` for auto clock-in/out alerts

7. **GeofencesScreen** (`src/screens/GeofencesScreen.tsx` -- new)
   - Pro-gated screen with permission banner for background location
   - List of geofences with client name, radius, auto-start/stop indicators
   - Toggle active/inactive per geofence via Switch
   - Delete geofence with confirmation
   - Add form: client chip picker, radius input, "Save Current Location" button
   - FAB for adding new geofences

8. **App permissions** (`app.json`)
   - iOS: Added `location` to UIBackgroundModes, NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription
   - Android: Added ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_BACKGROUND_LOCATION
   - Added expo-location plugin with background location enabled

9. **Pro gating & navigation**
   - Added `case 'geofencing': return false` to checkFeatureAccess
   - Added geofencing paywall message
   - Added GeofencesScreen to navigation stack
   - Added "GPS Auto Clock-in" row in Settings Data section with PRO badge

**No new dependencies** -- uses existing expo-location and expo-task-manager.

### Advanced Analytics (Sprint 12)
Pro-gated analytics dashboard with deeper insights beyond the basic Reports screen. Weekly goal tracking, earnings trends, client profitability, and time insights.

1. **New types** (`src/types/index.ts`)
   - Added `Analytics` route to `RootStackParamList`
   - Added `'analytics'` to `PremiumFeature` union
   - Added `weekly_hours_goal: number` to `UserSettings` interface
   - Added `weekly_hours_goal?: number` to `UpdateSettingsInput` interface

2. **Database migration** (`src/db/database.ts`)
   - Added `weekly_hours_goal INTEGER DEFAULT 0` column to `user_settings` table
   - Migration uses PRAGMA table_info check (same pattern as existing migrations)

3. **Analytics Repository** (`src/db/analyticsRepository.ts` — new)
   - `getClientProfitability()` — per client: name, total hours, earnings, material costs, net profit, effective $/hr
   - `getAverageSessionStats()` — average session duration + total session count
   - `getBusiestDayOfWeek()` — total seconds per day of week (all 7 days filled)
   - `getMonthlyTrend(numMonths)` — total hours + earnings per month for last N months
   - `getCurrentWeekHours()` — hours worked in current week
   - `getWeeklyGoal()` / `setWeeklyGoal()` — read/write weekly hours goal from user_settings

4. **Hook** (`src/hooks/useAnalytics.ts` — new)
   - `useAnalytics()` — loads all analytics data on screen focus
   - Parallel data fetching via Promise.all (8 queries)
   - Exposes `setWeeklyGoal()` for inline goal editing

5. **AnalyticsScreen** (`src/screens/AnalyticsScreen.tsx` — new)
   - **Weekly Goal card** — progress bar with percentage, inline edit with number input, "Set Goal" prompt if no goal set, green highlight at 100%+
   - **Earnings Trend card** — bar chart with toggle between 8-week and 6-month views, x-axis labels (W1-W8 or month abbreviations)
   - **Client Profitability card** — ranked list: client name, hours, earnings, material costs, net profit, effective $/hr rate
   - **Time Insights card** — average session duration, total sessions count, busiest day of week with day-of-week bar chart breakdown

6. **Pro gating & paywall**
   - Added `case 'analytics': return false` to `checkFeatureAccess` (`src/contexts/SubscriptionContext.tsx`)
   - Added `analytics: 'Upgrade to unlock advanced analytics'` to PaywallScreen feature messages

7. **Navigation** (`src/navigation/AppNavigator.tsx`)
   - Added `AnalyticsScreen` to stack with home button header

8. **Settings** (`src/screens/SettingsScreen.tsx`)
   - "Analytics" row added in Data section between Project Templates and Export & Backup
   - Shows PRO badge for free-tier users; navigates to Paywall if not premium

9. **Settings repository** (`src/db/settingsRepository.ts`)
   - Added `weekly_hours_goal` to getSettings() default and boolean/null handling
   - Added `weekly_hours_goal` update handling in updateSettings()

**No new dependencies** — pure SQLite + React Native Views (same bar chart pattern as ReportsScreen).

### Project Templates (Sprint 11)
Reusable project templates that pre-fill duration, notes, and materials when starting new jobs. Free users can browse and use all templates (including 14 built-in ones); creating custom templates requires Pro.

1. **New types** (`src/types/index.ts`)
   - Added `TradeCategory` union type (7 trades: plumbing, electrical, hvac, carpentry, painting, landscaping, general)
   - Added `ProjectTemplate`, `TemplateMaterial`, `CreateProjectTemplateInput` interfaces
   - Added `'project_templates'` to `PremiumFeature` union
   - Added `ProjectTemplates` route to `RootStackParamList`

2. **Database migration** (`src/db/database.ts`)
   - New `project_templates` table (id, title, trade_category, estimated_duration_seconds, default_notes, is_builtin, timestamps)
   - New `template_materials` table (id, template_id FK CASCADE, name, cost, created_at) with index on template_id
   - 14 seeded built-in templates across 7 trades with materials (e.g., Faucet Replacement with faucet/supply lines/putty)
   - Both tables added to `resetDatabase()`

3. **Repository** (`src/db/projectTemplateRepository.ts` — new)
   - Full CRUD: getAllTemplates, getTemplatesByCategory, getTemplateById, createTemplate (with materials in transaction), updateTemplate, deleteTemplate (non-builtin only)
   - Template materials: getTemplateMaterials, addTemplateMaterial, deleteTemplateMaterial
   - Boolean casting for is_builtin field

4. **Hooks** (`src/hooks/useProjectTemplates.ts` — new)
   - `useProjectTemplates(category?)` — loading hook with optional category filter
   - `useProjectTemplateMutations()` — create, update, delete mutations
   - `useTemplateMaterials(templateId)` — materials for a specific template

5. **ProjectTemplatesScreen** (`src/screens/ProjectTemplatesScreen.tsx` — new)
   - SectionList grouped by trade category with section headers
   - Template cards show title, duration badge, built-in indicator
   - Tap to expand → shows materials list and notes
   - Long-press custom templates to delete
   - FAB "+" button for creating custom templates (Pro-gated via Paywall redirect)
   - Create modal: title input, trade category horizontal chips, hours:minutes duration, notes, dynamic material rows (add/remove)

6. **TemplatePicker component** (`src/components/TemplatePicker.tsx` — new)
   - Modal triggered from ClientDetailsScreen manual time entry form
   - SectionList of templates grouped by trade category
   - Template preview screen with duration, notes, and materials list
   - On selection: pre-fills hours, minutes, and notes in manual time form
   - "Add Materials?" confirmation dialog when template has materials → creates client materials

7. **ClientDetailsScreen integration** (`src/screens/ClientDetailsScreen.tsx`)
   - "Use Template" button added below notes input in manual time entry form
   - Opens TemplatePicker modal; on template selection, pre-fills manualHours, manualMinutes, manualNotes
   - If user confirms, template materials are added to the client via addMaterial()

8. **Pro gating & paywall**
   - Added `case 'project_templates': return false` to `checkFeatureAccess` switch (`src/contexts/SubscriptionContext.tsx`)
   - Added `project_templates: 'Upgrade to create custom templates'` to PaywallScreen feature messages

9. **Navigation & Settings**
   - Added `ProjectTemplatesScreen` to navigation stack with home button header (`src/navigation/AppNavigator.tsx`)
   - "Project Templates" row added in Settings Data section between Recurring Jobs and Export & Backup
   - Shows PRO badge for free-tier users; always navigates to screen (browsing is free)

**No new dependencies** — pure SQLite + React Native UI.

### Recurring Jobs & Invoice Scheduling (Sprint 9)
Pro-only feature for setting up repeating jobs that auto-generate time sessions and invoices on app startup:

1. **New types** (`src/types/index.ts`)
   - Added `RecurringFrequency`, `DayOfWeek`, `OccurrenceStatus` type aliases
   - Added `RecurringJob`, `CreateRecurringJobInput`, `UpdateRecurringJobInput`, `RecurringJobOccurrence` interfaces
   - Added `'recurring_jobs'` to `PremiumFeature` union
   - Added `RecurringJobs` route to `RootStackParamList`

2. **Database migration** (`src/db/database.ts`)
   - New `recurring_jobs` table (id, client_id FK CASCADE, title, frequency CHECK, day_of_week 0-6, day_of_month 1-28, duration_seconds, notes, auto_invoice, is_active, start/end dates, last_generated_date, timestamps)
   - New `recurring_job_occurrences` table (id, recurring_job_id FK CASCADE, scheduled_date, status CHECK pending/completed/skipped, session_id FK SET NULL, invoice_id FK SET NULL)
   - Unique index on (recurring_job_id, scheduled_date) for idempotent generation
   - Both tables added to `resetDatabase()`

3. **Repository** (`src/db/recurringJobRepository.ts` — new)
   - Full CRUD for recurring jobs: getAll, getActive, getByClientId, getById, create, update, delete
   - Occurrence CRUD: getByJobId, create (INSERT OR IGNORE), updateStatus, getPendingUpTo (JOIN with jobs)
   - Boolean casting for SQLite integer fields

4. **Service** (`src/services/recurringJobService.ts` — new)
   - `generateOccurrences()` — calculates dates for active jobs using date-fns, creates occurrence rows, 100-occurrence safety cap
   - `processPendingOccurrences()` — creates time sessions via `createManualSession()`, optionally creates invoices via `createInvoice()`, error isolation per occurrence
   - `processRecurringJobs()` — main entry point called on app startup

5. **App startup integration** (`App.tsx`)
   - `processRecurringJobs()` called after notification permissions, before `setIsReady(true)`
   - Wrapped in try/catch — non-fatal, never blocks app startup

6. **Hooks** (`src/hooks/useRecurringJobs.ts` — new)
   - `useRecurringJobs()` — all jobs query with loading/error state
   - `useRecurringJobsByClient(clientId)` — per-client query
   - `useOccurrences(jobId)` — occurrences for a job
   - `useRecurringJobMutations()` — createJob, updateJob, deleteJob, skipOccurrence

7. **Screen** (`src/screens/RecurringJobsScreen.tsx` — new)
   - List mode: FlatList of job cards with title, client name, frequency badge, active/paused toggle, duration, auto-invoice indicator
   - Expandable cards showing occurrences with status badges and skip button
   - Create/Edit modal: client picker, title, frequency segmented control, day-of-week/month picker, duration (hours:minutes), notes, auto-invoice toggle, start/end date steppers
   - Empty state with CTA; FAB add button; Pro gate redirect on mount

8. **Navigation** (`src/navigation/AppNavigator.tsx`)
   - Added `RecurringJobsScreen` with home button header (same pattern as Export)

9. **Settings entry** (`src/screens/SettingsScreen.tsx`)
   - "Recurring Jobs" row added in Data section before Export & Backup
   - Shows PRO badge for free-tier users
   - Navigates to Paywall if not premium

10. **Paywall** (`src/screens/PaywallScreen.tsx`)
    - Added `recurring_jobs: 'Upgrade to set up recurring jobs'` to feature messages

**No new dependencies** — uses existing date-fns v4 and SQLite patterns.

### Multi-Currency Support (Sprint 3)
Full multi-currency system with Pro gating:

1. **Database migrations**
   - Added `currency TEXT DEFAULT 'USD'` to `clients` and `invoices` tables
   - Added `default_currency TEXT DEFAULT 'USD'` to `user_settings`
   - Existing data preserved (all defaults to USD)
   - Files: `src/db/database.ts`, `src/db/clientRepository.ts`, `src/db/invoiceRepository.ts`, `src/db/settingsRepository.ts`

2. **Currency utilities** (`src/utils/currency.ts` - new)
   - 6 currencies: USD, CAD, EUR, GBP, AUD, MXN
   - `formatCurrencyAmount()` using `Intl.NumberFormat` with locale-specific formatting
   - `getCurrencyInfo()` for symbol, flag, locale lookup
   - Updated `formatCurrency()` in formatters.ts to accept optional currency code

3. **CurrencyPicker component** (`src/components/CurrencyPicker.tsx` - new)
   - Modal bottom sheet with flag emoji, currency code, and name
   - Lock icon shown when disabled (free tier)
   - Used in AddClient, EditClient, and Settings screens

4. **UI integration across 12+ files**
   - All `formatCurrency()` calls now pass client/invoice currency
   - Client forms (Add/Edit) include currency selector defaulting to user's default
   - Settings screen has default currency picker with Premium badge
   - Reports client breakdown shows amounts in original currency
   - Invoice generation, sharing, and export use client currency
   - Files: All screen files, invoiceService.ts, shareService.ts, types/index.ts

5. **Pro gating**
   - Free tier locked to USD (CurrencyPicker disabled)
   - Selecting non-USD currency redirects to Paywall screen

### Advanced Export & Backup Enhancements (Sprint 2 completion)
Completed remaining export features:

1. **New CSV exports**
   - `exportClientsCSV()` — all client data
   - `exportMaterialsCSV()` — materials with client name and cost
   - Tags included in session CSV export

2. **Excel improvements**
   - Added Materials sheet to multi-sheet workbook
   - Tags column added to Sessions sheet

3. **Database restore**
   - `restoreDatabase(fileUri)` — parses JSON backup, validates format, restores data
   - Confirmation alert before proceeding
   - "Please restart" alert after successful restore
   - Uses `expo-document-picker` for file selection

4. **Export Screen UI updates**
   - Split into "Export Data" and "Backup & Restore" sections
   - Client CSV and Material CSV export options added
   - "Create Backup" and "Restore from Backup" buttons

### App Polish (Sprint 4.2)
Comprehensive UI consistency and UX improvements:

1. **Hardcoded color cleanup** — Replaced 7 hardcoded hex colors (#059669, #22C55E, #ECFDF5, #065F46) with COLORS constants across ReportsScreen, InvoiceHistoryScreen, MainScreen, LegalScreen

2. **Button disabled states** — Added `disabled={isSending}` to all 3 SendInvoiceScreen send buttons; added `isMutating` guard to EditSessionScreen save button

3. **Error message improvements**
   - EditClientScreen: replaced misleading "Client not found" spinner with proper error state
   - OnboardingScreen: shows Alert on error instead of silently navigating
   - Specific loading messages on all screens (e.g., "Loading sessions and materials..." instead of "Loading...")

### Performance & Stability Optimizations
Implemented Phase 1 performance improvements across the codebase:

1. **React.memo on list item components**
   - Wrapped `ClientCard` and `ClientCardCompact` with `React.memo` to prevent unnecessary re-renders in lists
   - Wrapped `TimeSessionCard` and `SessionGroupHeader` with `React.memo`
   - Files: `src/components/ClientCard.tsx`, `src/components/TimeSessionCard.tsx`

2. **Context value memoization (useMemo)**
   - Wrapped `SubscriptionContext` value object in `useMemo` to prevent unnecessary consumer re-renders
   - Wrapped `TimerContext` value object in `useMemo`
   - Wrapped `ThemeContext` value object in `useMemo`
   - Files: `src/contexts/SubscriptionContext.tsx`, `src/context/TimerContext.tsx`, `src/context/ThemeContext.tsx`

3. **React Error Boundary**
   - Created `ErrorBoundary` class component with fallback UI and reset capability
   - Wrapped `AppNavigator` in `App.tsx` with `ErrorBoundary` for graceful error recovery
   - Files: `src/components/ErrorBoundary.tsx` (new), `App.tsx`

4. **SQLite query optimization indexes**
   - Added `idx_clients_updated_at` on `clients(updated_at)` for sorted client listing
   - Added `idx_invoices_created_at` on `invoices(created_at)` for invoice history queries
   - Added `idx_sessions_start_time` on `time_sessions(start_time)` for time range queries
   - File: `src/db/database.ts`

### Advanced Export & Backup System
Implemented data export and backup functionality with Pro gating:

1. **Export Service** (`src/services/exportService.ts` - new)
   - CSV export for sessions (free: last 30 days, pro: full history)
   - CSV export for invoices (free: last 30 days, pro: full history)
   - Excel export with multi-sheet workbook (Sessions, Clients, Invoices) - Pro only
   - Full database backup as JSON (all 7 tables) - Pro only
   - Share helper using expo-sharing for device share sheet

2. **Export Screen** (`src/screens/ExportScreen.tsx` - new)
   - 4 export option cards with icons, descriptions, and loading states
   - Pro badge indicators on premium-only features
   - Upgrade prompt card for free users
   - Navigates to Paywall when free users tap Pro features
   - Uses `checkFeatureAccess('data_export')` for gating

3. **Navigation & Settings integration**
   - Added `Export` route to `RootStackParamList`
   - Added Export screen to navigation stack with home button header
   - Added "Data" section with "Export & Backup" link in Settings screen (before Legal section)
   - Files: `src/types/index.ts`, `src/navigation/AppNavigator.tsx`, `src/screens/SettingsScreen.tsx`

### Dependencies Added
- `xlsx` - Excel file generation for data export
- `expo-file-system` - File system access for export operations
- `expo-document-picker` - File selection for database restore
- `react-native-svg` - SVG rendering for QR codes
- `react-native-qrcode-svg` - QR code generation
- `expo-camera` - Camera for QR scanning and receipt capture
- `expo-calendar` - Calendar integration for session sync

---

### Freemium Paywall System
Implemented comprehensive freemium-to-Pro paywall system based on PAYWALL-STRATEGY.md:

1. **Monthly invoice limit (10/month for free tier)**
   - Added `getMonthlyInvoiceCount()` to invoice repository
   - Invoice limit check enforced in all three send handlers (email, SMS, share)
   - Redirects to Paywall screen when limit reached
   - Files: `src/db/invoiceRepository.ts`, `src/screens/SendInvoiceScreen.tsx`

2. **30-day report history limit for free tier**
   - Reports screen shows "Free plan: showing last 30 days only" banner
   - Invoice history filtered to last 30 days for free users
   - Tappable banners navigate to Paywall upgrade screen
   - Files: `src/screens/ReportsScreen.tsx`, `src/screens/InvoiceHistoryScreen.tsx`

3. **Updated PaywallScreen with new features**
   - Added "Unlimited Invoices" (10/month vs Unlimited) to comparison table
   - Added "Full Report History" (30 days vs Unlimited) to comparison table
   - Updated feature messages for new premium features
   - Files: `src/screens/PaywallScreen.tsx`

4. **Trial period adjusted from 15 to 14 days** (industry standard)
   - Updated trial calculation in settings repository
   - Updated display text on Paywall screen
   - Files: `src/db/settingsRepository.ts`, `src/screens/PaywallScreen.tsx`

5. **Subscription context enhancements**
   - Added `canCreateMoreInvoices()` async method
   - Added `unlimited_invoices` and `unlimited_history` to PremiumFeature type
   - Added `maxInvoicesPerMonth: 10` and `maxReportHistoryDays: 30` to FREE_TIER_LIMITS
   - Files: `src/contexts/SubscriptionContext.tsx`, `src/types/index.ts`

---

## Previous Changes (January 18, 2026)

### New Features
1. **Edit Time Sessions** - Users can now edit completed time sessions when they forget to stop the timer:
   - Edit date, start time, end time (12-hour format with AM/PM toggle)
   - Auto-calculated duration and billable amount
   - Edit session notes
   - Delete session from edit screen
   - Pencil icon on each session card for quick access
   - Files: `src/screens/EditSessionScreen.tsx` (new), `src/components/TimeSessionCard.tsx`, `src/screens/ClientDetailsScreen.tsx`, `src/db/sessionRepository.ts`, `src/hooks/useSessions.ts`

### UI Improvements
1. **Clarified invoice send options** - Updated button labels to make PDF availability clear:
   - "Email with PDF" - Email with PDF attachment
   - "iMessage / WhatsApp (PDF)" - Share via messaging apps with PDF
   - "SMS (Text Only)" - Plain text SMS without PDF
   - File: `src/screens/SendInvoiceScreen.tsx`

### Bug Fixes (January 17, 2026)
1. **Fixed back button on Main screen (iOS)** - Added `headerBackVisible: false` and `gestureEnabled: false` to prevent unwanted back button appearing on the home screen
   - File: `src/navigation/AppNavigator.tsx`

2. **Fixed footer buttons hidden on Android** - Increased bottom padding to 64dp on Android to clear the navigation bar
   - Files: `src/screens/AddClientScreen.tsx`, `src/screens/EditClientScreen.tsx`

### Dependencies Added
- `@expo/ngrok` - Added for tunnel mode during development

### Build Updates
- Created new iOS development build with all native modules
- Created Android development build
- Both builds available on EAS

---

## Current Build Information

**iOS Development Build:**
- Build ID: `81c791c7-7988-48ff-aef3-c049c890080e`
- URL: https://expo.dev/accounts/emersonader/projects/job-time-tracker/builds/81c791c7-7988-48ff-aef3-c049c890080e

**Android Development Build:**
- Build ID: `6f022830-650a-4935-bb74-2a6013648f2d`
- URL: https://expo.dev/accounts/emersonader/projects/job-time-tracker/builds/6f022830-650a-4935-bb74-2a6013648f2d

**Dev Server:** Run with `npx expo start --dev-client --lan`
- iPhone: Enter URL manually `http://<your-ip>:8081`
- Android: Enter URL manually `http://<your-ip>:8081`

---

## Known Issues

1. **Dev server discovery** - Phones may not auto-discover the dev server; manual URL entry required
2. **Tunnel mode slow** - Local LAN mode works better when on same WiFi network

---

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── Button.tsx
│   ├── ClientCard.tsx
│   ├── CurrencyPicker.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   ├── Input.tsx
│   ├── LoadingSpinner.tsx
│   ├── SearchBar.tsx
│   ├── TemplatePicker.tsx
│   └── TimeSessionCard.tsx
├── context/           # React Context providers
│   ├── ThemeContext.tsx
│   └── TimerContext.tsx
├── contexts/
│   └── SubscriptionContext.tsx
├── db/                # Database layer
│   ├── database.ts
│   ├── analyticsRepository.ts
│   ├── clientRepository.ts
│   ├── dashboardRepository.ts
│   ├── fleetRepository.ts
│   ├── geofenceRepository.ts
│   ├── insightsRepository.ts
│   ├── inventoryRepository.ts
│   ├── invoiceRepository.ts
│   ├── materialRepository.ts
│   ├── qrCodeRepository.ts
│   ├── receiptRepository.ts
│   ├── reportsRepository.ts
│   ├── projectTemplateRepository.ts
│   ├── recurringJobRepository.ts
│   ├── sessionRepository.ts
│   ├── settingsRepository.ts
│   └── tagRepository.ts
├── hooks/             # Custom React hooks
│   ├── useAnalytics.ts
│   ├── useClients.ts
│   ├── useFleet.ts
│   ├── useInsights.ts
│   ├── useIntegrations.ts
│   ├── useInventory.ts
│   ├── useMaterials.ts
│   ├── useProjectTemplates.ts
│   ├── useQRCodes.ts
│   ├── useReceipts.ts
│   ├── useRecurringJobs.ts
│   ├── useSessions.ts
│   ├── useSettings.ts
│   └── useTimer.ts
├── navigation/
│   └── AppNavigator.tsx
├── screens/           # App screens
│   ├── AnalyticsScreen.tsx
│   ├── ClientPortalScreen.tsx
│   ├── FleetScreen.tsx
│   ├── GeofencesScreen.tsx
│   ├── InsightsScreen.tsx
│   ├── IntegrationsScreen.tsx
│   ├── InventoryScreen.tsx
│   ├── MainScreen.tsx
│   ├── ChooseClientScreen.tsx
│   ├── AddClientScreen.tsx
│   ├── EditClientScreen.tsx
│   ├── ClientDetailsScreen.tsx
│   ├── EditSessionScreen.tsx
│   ├── QRCodesScreen.tsx
│   ├── ReceiptScannerScreen.tsx
│   ├── SendInvoiceScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── PaywallScreen.tsx
│   ├── RecurringJobsScreen.tsx
│   ├── ProjectTemplatesScreen.tsx
│   └── ExportScreen.tsx
├── services/          # Business logic services
│   ├── clientPortalService.ts
│   ├── exportService.ts
│   ├── geofenceService.ts
│   ├── integrationService.ts
│   ├── invoiceService.ts
│   ├── notificationService.ts
│   ├── recurringJobService.ts
│   ├── shareService.ts
│   ├── siriService.ts
│   ├── timerPersistence.ts
│   ├── watchService.ts
│   ├── weatherService.ts
│   └── widgetService.ts
├── types/             # TypeScript types
│   └── index.ts
└── utils/             # Utility functions
    ├── constants.ts
    ├── currency.ts
    ├── formatters.ts
    └── validation.ts
```

---

## Next Steps / Future Work

### High Priority
- [ ] Test full invoice flow on both platforms
- [ ] Verify Stripe subscription verification works end-to-end
- [ ] Test timer persistence across app kills
- [ ] Test freemium limits (3 clients, 10 invoices/month, 30-day history)
- [ ] Test 14-day trial flow for new users
- [x] ~~Add data export functionality (premium feature)~~ (completed)

### Medium Priority
- [x] ~~Add invoice history screen~~ (completed)
- [ ] Implement invoice templates/customization
- [x] ~~Add recurring client/job support~~ (completed - Sprint 9)
- [ ] Improve search with filters (by date, amount, etc.)
- [x] ~~Add reports/analytics dashboard~~ (completed)

### Low Priority
- [ ] Dark mode support
- [ ] Localization/multi-language support
- [ ] Cloud backup/sync (optional)
- [ ] Widget for quick timer access
- [ ] Apple Watch / Wear OS companion app

### Before App Store Release
- [ ] Thorough testing on multiple devices
- [ ] App Store screenshots and marketing materials
- [ ] Privacy policy and terms of service
- [ ] App Store listing optimization (ASO)
- [ ] Production build and submission

---

## Commands Reference

```bash
# Start dev server (LAN mode - recommended)
npx expo start --dev-client --lan

# Start dev server (tunnel mode - if LAN doesn't work)
npx expo start --dev-client --tunnel

# Build iOS development
eas build --profile development --platform ios

# Build Android development
eas build --profile development --platform android

# Build for production
eas build --profile production --platform all
```

---

## Notes

- App uses offline-first architecture with SQLite - no cloud backend required
- Timer persists across app restarts using AsyncStorage + SQLite
- Stripe web subscriptions verified via gramertech.com/api/check-subscription
- EAS project ID: `47beb11b-12f7-4f34-a5e8-3e4522dd67cb`
- Bundle ID: `com.jobtimetracker.app`
