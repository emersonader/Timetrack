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

### Navigation & UI
- [x] Stack-based navigation with 9 screens
- [x] Home screen with quick actions
- [x] Recent clients display
- [x] Active timer banner on home screen
- [x] Settings screen
- [x] Modal paywall presentation

---

## Recent Changes (February 8, 2026)

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
│   ├── EmptyState.tsx
│   ├── Input.tsx
│   ├── LoadingSpinner.tsx
│   ├── SearchBar.tsx
│   └── TimeSessionCard.tsx
├── context/           # React Context providers
│   ├── ThemeContext.tsx
│   └── TimerContext.tsx
├── contexts/
│   └── SubscriptionContext.tsx
├── db/                # Database layer
│   ├── database.ts
│   ├── clientRepository.ts
│   ├── sessionRepository.ts
│   ├── materialRepository.ts
│   ├── invoiceRepository.ts
│   └── settingsRepository.ts
├── hooks/             # Custom React hooks
│   ├── useClients.ts
│   ├── useSessions.ts
│   ├── useMaterials.ts
│   ├── useSettings.ts
│   └── useTimer.ts
├── navigation/
│   └── AppNavigator.tsx
├── screens/           # App screens
│   ├── MainScreen.tsx
│   ├── ChooseClientScreen.tsx
│   ├── AddClientScreen.tsx
│   ├── EditClientScreen.tsx
│   ├── ClientDetailsScreen.tsx
│   ├── EditSessionScreen.tsx
│   ├── SendInvoiceScreen.tsx
│   ├── SettingsScreen.tsx
│   └── PaywallScreen.tsx
├── services/          # Business logic services
│   ├── invoiceService.ts
│   ├── shareService.ts
│   ├── notificationService.ts
│   └── timerPersistence.ts
├── types/             # TypeScript types
│   └── index.ts
└── utils/             # Utility functions
    ├── constants.ts
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
- [ ] Add data export functionality (premium feature)

### Medium Priority
- [x] ~~Add invoice history screen~~ (completed)
- [ ] Implement invoice templates/customization
- [ ] Add recurring client/job support
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
