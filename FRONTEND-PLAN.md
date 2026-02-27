# HourFlow Frontend UX Redesign — Implementation Plan

**Created:** February 8, 2026
**App:** HourFlow — Track Time. Send Invoices. Get Paid.
**Repo:** `/Volumes/ExternalHome/Grumpy/openclaw-workspace/Timetrack/`
**Tech:** React Native 0.81.5 + Expo ~54 + TypeScript

---

## How To Use This File

This is the single source of truth for all frontend/UX implementation work. Before starting any task:

1. Read this file
2. Find the next unchecked sprint
3. Implement it
4. Run the validation checkpoint
5. Only move on if all checks pass
6. Mark the task ✅ with the date completed

**Do NOT skip validation checkpoints.** If something fails, fix it before moving forward.

---

## Reference Documents

Read these for design decisions, rationale, and specs:

- **`UX-REDESIGN-SPEC.md`** — The implementation blueprint. Screen layouts, color tokens, typography, animation configs, component specs, onboarding flow, celebration tiers. **This is your primary reference.**
- **`UX-RESEARCH-FOUNDATION.md`** — Research v1: competitor analysis, dopamine psychology, color science, animation patterns
- **`UX-RESEARCH-FOUNDATION-v2.md`** — Research v2: deeper citations, Reddit user quotes, TypeScript recipes, Duolingo experiment data, Material Design 3 tonal elevation

Cross-reference both research docs when implementing. They overlap ~60-70% but each has unique insights.

---

## Current State

The app is functional with basic UI. These exist but will be redesigned:
- [x] Timer (start/stop, persistence, crash recovery)
- [x] Client management (CRUD, search, rates)
- [x] Time sessions (manual entry, editing, tags)
- [x] Invoicing (PDF generation, payment methods, sharing)
- [x] Materials tracking
- [x] Settings (business info, branding, payment methods)
- [x] Dark/light theme (basic implementation)
- [x] Email auth + biometric lock
- [x] Stripe web subscription + freemium paywall
- [x] Onboarding (basic)

---

## Sprint F1: Design System Foundation

**Goal:** Build the theme system and core tokens. Everything else depends on this.

### Task F1.1 — Theme Tokens
- [ ] Create `src/theme/tokens.ts` — Single source of truth for ALL design tokens
- [ ] Implement complete Light Mode palette from spec (Section 1.3): `background`, `surface`, `surfaceElevated`, `primary` (#6366F1), `primaryHover`, `success`, `warning`, `error`, `billable`, `textPrimary`, `textSecondary`, `textTertiary`, `border`, `borderFocus`
- [ ] Implement complete Dark Mode palette from spec (Section 1.3): `background` (#0F0F1A), `surface` (#1A1A2E), `surfaceElevated` (#252540), desaturated variants of all colors
- [ ] Implement typography scale from spec (Section 1.4): `displayLarge` through `caption` with size, weight, lineHeight, letterSpacing
- [ ] Implement spacing scale from spec (Section 1.5): `xs` (4px) through `3xl` (48px)
- [ ] Implement semantic status colors (running, paid, pending, overdue, billable, non-billable)

### Task F1.2 — Theme Provider
- [ ] Create `src/theme/ThemeProvider.tsx` — Context provider wrapping the app
- [ ] Detect system color scheme via `useColorScheme()`
- [ ] Support three modes: Light / Dark / System Default (default to System)
- [ ] Store user preference in SQLite `user_settings`
- [ ] Create `src/theme/useTheme.ts` hook returning current palette + typography + spacing
- [ ] Smooth 200ms crossfade transition when switching modes

### Task F1.3 — Replace All Hardcoded Styles
- [ ] Audit every file in `src/screens/` and `src/components/` for hardcoded colors, font sizes, spacing
- [ ] Replace ALL with `useTheme()` tokens
- [ ] Zero hardcoded color values remaining in any component (verify with grep)

### 🧪 Validation Checkpoint — Sprint F1

```bash
# 1. TypeScript — ZERO errors
npx tsc --noEmit

# 2. Build check
npx expo export --platform ios 2>&1 | tail -20

# 3. No hardcoded colors remaining
grep -rn '#[0-9A-Fa-f]\{6\}' src/screens/ src/components/ --include='*.tsx' --include='*.ts' | grep -v 'theme\|tokens\|\.test' | head -20
# Should return NOTHING (or only inside theme files)
```

**Manual smoke tests:**
- [ ] App launches in Light mode — colors match spec palette
- [ ] App launches in Dark mode — colors match spec palette (no pure black, no pure white text)
- [ ] Toggle Light → Dark → System in Settings — transitions smoothly
- [ ] All screens readable in both modes (no invisible text, no contrast issues)
- [ ] Dark mode uses tonal elevation (lighter surfaces = higher), NOT shadows

---

## Sprint F2: Core Component Library

**Goal:** Build reusable components that every screen uses. Spec Section 8.3.

### Task F2.1 — Interactive Primitives
- [ ] `src/components/ui/Button.tsx` — Primary, Secondary, Ghost, Destructive variants. Press animation: scale 0.95 with `withSpring({ damping: 15, stiffness: 400 })` + `Haptics.impactAsync(Light)`. Minimum 44×44pt touch target
- [ ] `src/components/ui/AnimatedPressable.tsx` — Reusable pressable wrapper with scale + haptic. All interactive elements use this
- [ ] `src/components/ui/Input.tsx` — Text input with focus ring animation (`borderFocus` token). Proper keyboard avoiding
- [ ] `src/components/ui/Select.tsx` — Picker that opens a bottom sheet
- [ ] `src/components/ui/BottomSheet.tsx` — Modal bottom sheet with drag handle, snap points, backdrop

### Task F2.2 — Display Components
- [ ] `src/components/ui/Card.tsx` — 16px padding, 12px border-radius, 1px border. Light mode: subtle shadow `0 1px 3px rgba(0,0,0,0.08)`. Dark mode: no shadow, surface color elevation
- [ ] `src/components/ui/Badge.tsx` — Status badges with color + icon + label triad (color-blind safe)
- [ ] `src/components/ui/Toast.tsx` — Success/error notification toast with slide-in animation
- [ ] `src/components/ui/Skeleton.tsx` — Loading placeholder with Moti pulsing opacity (0.4 → 1, 1500ms loop)
- [ ] `src/components/ui/EmptyState.tsx` — Illustration + headline + CTA template. Reusable across all screens

### Task F2.3 — Data Display Components
- [ ] `src/components/ui/ProgressBar.tsx` — Animated fill with gradient (`primary` → `success`). Spring physics
- [ ] `src/components/ui/ProgressRing.tsx` — Circular progress for weekly goals. Animated draw
- [ ] `src/components/ui/TimerDisplay.tsx` — Large rolling number display using `react-native-animated-rolling-numbers`. Each digit rolls independently. `Easing.out(Easing.cubic)` at 600ms
- [ ] `src/components/ui/RollingNumber.tsx` — Financial number display ($XXX.XX) with rolling animation for earnings/totals

### Task F2.4 — List Components
- [ ] `src/components/ui/TimeEntryCard.tsx` — Project color dot + task name + client + duration + billable indicator + time range. Swipe left to delete, swipe right to duplicate. Staggered entry: `FadeInDown.delay(index * 60).duration(400).springify()`
- [ ] `src/components/ui/InvoiceCard.tsx` — Invoice summary with status badge (color + icon)
- [ ] `src/components/ui/ClientCard.tsx` — Client name, project count, total hours, total billed, uninvoiced amount

### Task F2.5 — Install Required Dependencies
- [ ] Install `react-native-reanimated` (v3+) if not present
- [ ] Install `react-native-gesture-handler` if not present
- [ ] Install `moti` for declarative animations
- [ ] Install `lottie-react-native` for celebration animations
- [ ] Install `expo-haptics` if not present
- [ ] Install `react-native-animated-rolling-numbers` for financial tickers
- [ ] Install `lucide-react-native` for iconography
- [ ] Verify all deps work together — no version conflicts

### 🧪 Validation Checkpoint — Sprint F2

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Create a test screen that renders every component — verify they display correctly in both Light and Dark mode
- [ ] Button press animation feels snappy (scale + haptic)
- [ ] Bottom sheet opens/closes with drag gesture
- [ ] Skeleton shimmer animates smoothly
- [ ] Rolling number display works (pass changing values)
- [ ] Swipe gestures work on TimeEntryCard
- [ ] All touch targets meet 44×44pt minimum
- [ ] All badges show color + icon + label (never color alone)
- [ ] Remove test screen after validation

---

## Sprint F3: Navigation & Tab Bar

**Goal:** New 5-tab navigation with animated indicator. Spec Section 2.1.

### Task F3.1 — Tab Bar Implementation
- [ ] Replace existing navigation with 5-tab bottom navigator: Timer, Timesheets, Invoices, Clients, More
- [ ] Custom tab bar component with sliding indicator: `withSpring({ damping: 20, stiffness: 200 })`
- [ ] Active tab icon: scale to 1.15 with spring, switch to filled Lucide variant
- [ ] Tab label: fade in at 200ms
- [ ] Haptic: `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on tab switch
- [ ] Colors: Active = `primary`, Inactive = `textSecondary`
- [ ] Icons: `Clock` (Timer), `FileText` (Timesheets... or use `CalendarDays`), `FileText` (Invoices), `Users` (Clients), `Menu` or `MoreHorizontal` (More)

### Task F3.2 — Persistent Timer Banner
- [ ] When timer is running and user navigates away from Timer tab, show slim banner (48px height)
- [ ] Banner shows: project color dot + project/client name + running duration + stop button
- [ ] Tapping banner navigates to Timer screen
- [ ] Banner animates in/out (slide down/up)
- [ ] Duration updates in real-time on the banner

### Task F3.3 — Screen Structure
- [ ] Create placeholder screens for new structure: `TimerScreen`, `TimesheetsScreen`, `InvoiceListScreen`, `ClientListScreen`, `MoreScreen`
- [ ] Set up stack navigators within each tab for drill-down (e.g., Client List → Client Detail)
- [ ] Screen transitions: default slide (300ms)

### 🧪 Validation Checkpoint — Sprint F3

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] All 5 tabs visible and tappable
- [ ] Sliding indicator animates smoothly between tabs
- [ ] Active tab icon scales up and changes to filled variant
- [ ] Haptic fires on tab switch
- [ ] Start a timer → navigate to another tab → persistent banner appears
- [ ] Tapping banner returns to Timer screen
- [ ] Banner stop button stops the timer
- [ ] Stack navigation works within tabs (push/pop screens)
- [ ] Both Light and Dark mode look correct

---

## Sprint F4: Timer Screen Redesign

**Goal:** The most important screen. Must feel alive. Spec Section 3.1.

### Task F4.1 — Timer Screen Layout
- [ ] Greeting header: "Good morning/afternoon/evening, [Name]" + settings gear icon
- [ ] Active timer card (large): project color, project/client name, timer display (displayLarge), real-time billable amount, stop button (80×80pt)
- [ ] When no timer running: large START button (80×80pt, `primary` color) with pulsing glow + "What are you working on?" input field
- [ ] Saved timers section: grid of color-coded pills (max 8). One tap = start. Long press = edit. "+" pill to add new
- [ ] Recent entries section: list of recent time entries with duration and billable indicator

### Task F4.2 — Timer Animations
- [ ] **Pulsing glow** while running: `withRepeat(withSequence(withTiming(1.08, { duration: 1200 }), withTiming(1, { duration: 1200 })), -1, true)`
- [ ] **Start press:** squeeze to 0.92 (80ms), bounce to 1.05 `withSpring({ damping: 8, stiffness: 300 })`, settle to 1.0. Haptic: `impactAsync(Medium)`
- [ ] **Stop press:** scale to 0.9, color flash to `success`. Haptic: `notificationAsync(Success)`. Lottie checkmark (300ms). Card transitions to completed entry
- [ ] **Number display:** rolling digits via `react-native-animated-rolling-numbers`
- [ ] **Real-time earnings:** number ticks up with rolling animation, green color, `$XXX.XX` format
- [ ] **Pulsing START button** when idle: subtle glow animation

### Task F4.3 — "Start X Minutes Ago" Feature
- [ ] Long-press the start button to reveal a time picker
- [ ] "I actually started at [time]" — lets user backdate the timer start
- [ ] Haptic on long-press activation: `impactAsync(Heavy)`

### Task F4.4 — Saved Timers
- [ ] Store saved timer configs in SQLite (new `saved_timers` table: id, client_id, project_name, color, position)
- [ ] Grid layout with color-coded pills
- [ ] One tap starts timer immediately for that client/project
- [ ] Long press opens edit sheet
- [ ] "+" pill at end to create new saved timer
- [ ] Max 8 visible with horizontal scroll if needed

### 🧪 Validation Checkpoint — Sprint F4

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Timer screen shows greeting with correct time of day
- [ ] START button pulses when no timer running
- [ ] Tapping START begins timer with haptic + animation
- [ ] Timer display rolls digits smoothly
- [ ] Earnings tick up in real-time (if client has hourly rate)
- [ ] STOP button triggers checkmark animation + haptic
- [ ] Saved timer pills display, one-tap starts timer
- [ ] Long-press START shows time picker for backdating
- [ ] Long-press saved timer opens edit
- [ ] Screen looks great in both Light and Dark mode
- [ ] All previous sprint tests still pass

---

## Sprint F5: Timesheets Screen

**Goal:** Beautiful time entry list with weekly progress. Spec Section 3.2.

### Task F5.1 — List View (Default)
- [ ] Header with Calendar/List toggle icons
- [ ] Weekly summary bar: "This Week: XXh XXm" + animated progress bar + billable amount
- [ ] Time entries grouped by day ("Today, Feb 8", "Yesterday, Feb 7", etc.)
- [ ] Each entry uses `TimeEntryCard` component (from Sprint F2)
- [ ] Staggered entry animation on load
- [ ] Swipe left to delete (with confirmation alert)
- [ ] Swipe right to duplicate/continue timer
- [ ] Tap to edit (opens bottom sheet editor)

### Task F5.2 — Time Entry Editor (Bottom Sheet)
- [ ] Bottom sheet with: client picker, project/task name, start time, end time, duration, notes, tags, billable toggle
- [ ] Date/time pickers
- [ ] Save button with haptic confirmation
- [ ] Delete option with destructive styling

### Task F5.3 — Calendar View
- [ ] Weekly grid showing colored blocks per entry
- [ ] Tap a day to see entries for that day
- [ ] Daily totals displayed
- [ ] Swipe left/right to navigate weeks

### Task F5.4 — Weekly Progress Bar
- [ ] Animated fill from left on screen load
- [ ] Gradient from `primary` → `success` as approaching weekly goal
- [ ] Show percentage and hours (e.g., "32/40h — 80%")
- [ ] Haptic when goal is reached: `impactAsync(Light)`

### 🧪 Validation Checkpoint — Sprint F5

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Timesheets tab shows entries grouped by day
- [ ] Weekly summary bar shows correct totals
- [ ] Progress bar animates on load
- [ ] Swipe left deletes entry (with confirmation)
- [ ] Swipe right duplicates/continues
- [ ] Tap opens bottom sheet editor
- [ ] Editor saves changes correctly to SQLite
- [ ] Calendar view shows colored blocks
- [ ] Toggle between List and Calendar works
- [ ] Empty state shows when no entries

---

## Sprint F6: Invoice Screen Redesign

**Goal:** Invoice list with status filters and multi-step builder. Spec Section 3.3.

### Task F6.1 — Invoice List
- [ ] Uninvoiced time banner at top (Zeigarnik trigger): "$X,XXX.XX across X clients [Create →]"
- [ ] Filter tabs: All, Draft, Sent, Paid, Overdue
- [ ] Invoice cards with: invoice number, client name, amount, date, status badge (color + icon + label)
- [ ] "Paid" badges get subtle celebration styling (green checkmark)
- [ ] "+ New" button in header
- [ ] Staggered list animation

### Task F6.2 — Invoice Builder (Multi-Step)
- [ ] Step 1/4: Select Client (client picker with search)
- [ ] Step 2/4: Add Line Items (auto-populated from uninvoiced time entries for selected client)
- [ ] Step 3/4: Review & Customize (preview, adjust amounts, add notes, payment terms)
- [ ] Step 4/4: Send (email, SMS, share sheet options)
- [ ] Progress bar at top showing current step
- [ ] Running total with rolling number animation
- [ ] Each step transitions with slide animation

### Task F6.3 — Invoice Detail
- [ ] Professional preview of invoice as client sees it
- [ ] Status badge with color + icon
- [ ] Action buttons: Send, Download PDF, Mark as Paid, Edit
- [ ] Payment history timeline
- [ ] "Mark as Paid" triggers **PEAK celebration** (full confetti — implement in Sprint F9)

### 🧪 Validation Checkpoint — Sprint F6

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Uninvoiced time banner appears when there's unbilled time
- [ ] Filter tabs work (All/Draft/Sent/Paid/Overdue)
- [ ] Invoice builder walks through all 4 steps
- [ ] Line items auto-populate from uninvoiced time
- [ ] Running total updates with rolling animation
- [ ] Invoice detail shows professional preview
- [ ] PDF generation still works
- [ ] Mark as Paid updates status correctly
- [ ] Empty state when no invoices

---

## Sprint F7: Client Screen Redesign

**Goal:** Client list with metrics and rich detail view. Spec Section 3.4.

### Task F7.1 — Client List
- [ ] Client cards showing: name, active projects count, total hours, total billed, uninvoiced amount
- [ ] Client color (user-assigned) as accent on each card
- [ ] Sort options: Name, Total Hours, Uninvoiced Amount
- [ ] Search bar at top (fuzzy search with existing fuse.js)
- [ ] Staggered list animation

### Task F7.2 — Client Detail
- [ ] Header: client name + contact info
- [ ] Metrics row: Total Billed, Uninvoiced amount
- [ ] Projects section (color-coded list)
- [ ] Recent Activity section (latest time entries)
- [ ] Invoices section (linked invoices with status)
- [ ] Edit button → client editor

### Task F7.3 — Client/Project Editor
- [ ] Bottom sheet or full screen editor
- [ ] Fields: name, email, phone, address, hourly rate, currency, color picker
- [ ] Color picker for client accent color (grid of preset colors)
- [ ] Save with haptic confirmation

### 🧪 Validation Checkpoint — Sprint F7

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Client list shows metrics per client
- [ ] Sort options work correctly
- [ ] Search finds clients by name/email/phone
- [ ] Client detail shows correct totals, projects, activity, invoices
- [ ] Client editor saves changes
- [ ] Color picker works and color appears on client card
- [ ] Empty state when no clients
- [ ] Paywall enforces 3-client limit on free tier

---

## Sprint F8: More Screen (Reports, Settings, Profile)

**Goal:** Reports dashboard, settings redesign, profile. Spec Section 3.5–3.6.

### Task F8.1 — More Screen Hub
- [ ] Menu items: Reports, Settings, Profile/Account, Achievements (placeholder), About
- [ ] Clean card-based layout with icons
- [ ] Version number and GramerTech branding in footer

### Task F8.2 — Weekly Summary / Reports Dashboard
- [ ] "Your Week in Review" header
- [ ] Total hours tracked + comparison to last week (green ↑ / red ↓)
- [ ] Total earnings with rolling number animation
- [ ] Donut chart: time by project/client (color-coded). Animated clockwise draw on entry
- [ ] Bar chart: daily hours Mon–Sun. Bars grow from bottom with staggered delay
- [ ] Streak display: "🔥 X-day streak" (data model only — full streak system in Sprint F10)

### Task F8.3 — Settings Redesign
- [ ] Profile section: Name, company, hourly rate, default currency
- [ ] Appearance: Light/Dark/System toggle (uses ThemeProvider from F1)
- [ ] Sounds & Haptics: Global toggle
- [ ] Data: Export, Backup (links to Export screen from backend plan)
- [ ] Subscription: Current plan, manage subscription link
- [ ] About: Version, support link, gramertech.com link

### 🧪 Validation Checkpoint — Sprint F8

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] More screen shows all menu items
- [ ] Reports dashboard shows correct weekly data
- [ ] Donut chart animates on entry
- [ ] Bar chart bars grow with stagger
- [ ] Settings toggles work (theme, sounds)
- [ ] Profile edits save correctly
- [ ] About screen shows version and links

---

## Sprint F9: Celebrations & Haptic System

**Goal:** Tiered celebration system. THE differentiator. Spec Section 4.

### Task F9.1 — Celebration Overlay System
- [ ] Create `src/components/celebrations/CelebrationOverlay.tsx` — Full-screen overlay system
- [ ] Create `src/components/celebrations/Confetti.tsx` — Confetti burst animation (Lottie or Skia)
- [ ] Create `src/components/celebrations/CoinRain.tsx` — Gold coin rain for payment received
- [ ] Create `src/services/celebrationService.ts` — Triggers celebrations based on events
- [ ] Celebration context/provider so any screen can trigger celebrations

### Task F9.2 — Celebration Tiers (from spec Section 4.3)
- [ ] **Timer start:** Quick squeeze + bounce + `impactAsync(Medium)` (already in F4, verify)
- [ ] **Timer stop:** Lottie checkmark (300ms) + `notificationAsync(Success)` (already in F4, verify)
- [ ] **Time entry saved:** Subtle slide-in toast + `impactAsync(Light)`
- [ ] **Invoice created:** Progress complete glow + `impactAsync(Medium)`
- [ ] **Invoice sent:** Paper plane Lottie (600ms) + `notificationAsync(Success)`
- [ ] **Payment received:** FULL CELEBRATION — Gold confetti (1.5s) + coin rain + rolling number amount + `impactAsync(Heavy)` × 2 with 100ms gap
- [ ] **Weekly goal hit:** Confetti burst + badge + `notificationAsync(Success)`

### Task F9.3 — Sound Design
- [ ] Source or create short sound files: click (0.1s), done tone (0.2s), whoosh (0.3s), cha-ching (0.5s), error tone (0.2s)
- [ ] Integrate with `expo-av` for playback
- [ ] Pair sounds with celebration tiers per spec Section 4.5
- [ ] Global mute toggle in Settings (respects user preference)
- [ ] App works perfectly without sound

### Task F9.4 — Reduced Motion
- [ ] Detect `ReduceMotion.System` from Reanimated
- [ ] When enabled: replace all slide/bounce with 200ms crossfade
- [ ] Timer pulse → static glow indicator
- [ ] Celebrations → static badge + haptic only
- [ ] Number rolling → instant update
- [ ] List stagger → instant render
- [ ] Keep haptics (they don't cause vestibular issues)

### 🧪 Validation Checkpoint — Sprint F9

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Timer start/stop celebrations fire correctly
- [ ] Invoice sent shows paper plane animation
- [ ] Mark invoice as Paid triggers FULL gold confetti celebration
- [ ] Sounds play at appropriate moments
- [ ] Muting sounds in Settings silences all sounds
- [ ] Enable Reduce Motion in iOS Settings → all animations replaced with crossfades
- [ ] Haptics still fire with Reduce Motion enabled
- [ ] No celebration blocks user interaction (overlay dismisses properly)

---

## Sprint F10: Onboarding Flow

**Goal:** Value-first onboarding before signup. Spec Section 5.

### Task F10.1 — Welcome Screen
- [ ] "Track Time. Send Invoices. Get Paid." (large)
- [ ] "See how it works in 60 seconds" (subtitle)
- [ ] Single [Get Started] button (primary, full width)
- [ ] No signup, no login, no account creation on this screen

### Task F10.2 — Personalization (2 Questions)
- [ ] Screen 1: "What do you do?" — Grid of tappable options (Design, Development, Consulting, Writing, Marketing, Photography, Carpentry/Trades, Other)
- [ ] Screen 2: "What matters most?" — Pill options (Track hours accurately, Invoice clients faster, See my earnings, All of the above)
- [ ] Single question per screen, one tap each
- [ ] Progress dots at top
- [ ] Store selections in SQLite for personalization

### Task F10.3 — Guided First Timer
- [ ] "Let's track your first hour"
- [ ] Pre-configured demo project based on selected profession
- [ ] Large START button — user taps to start a real timer
- [ ] Show real-time earnings ticking up (demo rate based on profession)
- [ ] User taps STOP when ready

### Task F10.4 — The Aha Moment
- [ ] Timer stops → time entry created → instantly show auto-generated invoice preview
- [ ] "That's it. Time tracked → invoice ready."
- [ ] Invoice preview looks PROFESSIONAL (branded, line-itemized)
- [ ] Subtle celebration animation (confetti glow)

### Task F10.5 — Signup
- [ ] "Save your progress"
- [ ] [Continue with Apple] (primary, prominent) — if Apple auth feasible
- [ ] [Sign up with email] (existing email auth flow)
- [ ] "Your tracked time is already saved"
- [ ] Onboarding data persists — not lost after signup

### Task F10.6 — Empty States
- [ ] No timers: "Tap ▶ to track your first hour" + CTA
- [ ] No time entries: "Your timesheet is waiting" + [Start Timer] CTA
- [ ] No invoices: Invoice mockup preview + "Your first invoice is one tap away"
- [ ] No clients: "Add your first client to organize projects" + quick-add form
- [ ] No reports: Sample chart with placeholder + "Track a few days to see your patterns"

### 🧪 Validation Checkpoint — Sprint F10

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Fresh install → onboarding flow starts (not main app)
- [ ] Can complete all 5 onboarding screens without issues
- [ ] Demo timer starts and shows earnings
- [ ] Aha moment invoice looks professional
- [ ] Signup works and preserves onboarding data
- [ ] After onboarding → lands on Timer screen
- [ ] Empty states appear on all screens for new user
- [ ] Returning user does NOT see onboarding again

---

## Sprint F11: Streaks & Achievements

**Goal:** Gamification layer. Spec Section 6.

### Task F11.1 — Streak System
- [ ] New SQLite table: `streaks` (current_streak, longest_streak, last_tracked_date, freeze_count, freeze_used_this_month)
- [ ] Track consecutive workdays with time logged (exclude weekends by default)
- [ ] Display on Timer screen: "🔥 X-day streak"
- [ ] Streak freezes: 2 free per month
- [ ] Milestone celebrations at: 7, 14, 30, 60, 90, 180, 365 days
- [ ] Streak break: gentle message ("Your streak reset to 0, but your total of X streak days is saved")
- [ ] Show current streak vs. longest streak

### Task F11.2 — Achievement Badges
- [ ] New SQLite table: `achievements` (badge_id, earned_at, progress)
- [ ] Badge definitions (from spec Section 6.2):
  - Beginner: First Timer, Invoice Rookie, Client Starter
  - Consistency: Week Warrior (7d), Monthly Master (30d), Quarterly Champion (90d)
  - Volume: Century Club (100h), Revenue Milestones ($1K/$5K/$10K/$50K/$100K)
  - Efficiency: Speed Demon (invoice <24h), Quick Draw (timer <3s from open)
  - Fun: Night Owl (after 10pm), Early Bird (before 7am), Weekend Warrior, Marathon (8h+ timer)
- [ ] Badge checking logic runs after relevant events (timer stop, invoice create, etc.)
- [ ] Badge earned → flip reveal animation + achievement tone + haptic

### Task F11.3 — Achievement Gallery
- [ ] Screen accessible from More tab
- [ ] Grid of circular badges — color-coded by tier (bronze/silver/gold/platinum)
- [ ] Locked badges: grayed silhouette with progress indicator
- [ ] Earned badges: full color with earned date
- [ ] Tap badge for details

### Task F11.4 — Zeigarnik Triggers
- [ ] Weekly hours progress ring on Timer screen ("32/40h" = 80%)
- [ ] Uninvoiced amount badge on Invoices tab icon (red dot with count)
- [ ] "X draft invoices ready to send" notification
- [ ] Monthly billing progress: "$X,XXX / $X,XXX target"

### 🧪 Validation Checkpoint — Sprint F11

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Streak counter appears on Timer screen
- [ ] Tracking time on consecutive days increments streak
- [ ] Missing a day resets streak (with gentle message)
- [ ] Streak freeze prevents reset
- [ ] Earning a badge triggers animation + haptic
- [ ] Achievement gallery shows earned/locked badges
- [ ] Progress ring shows on Timer screen
- [ ] Uninvoiced badge appears on Invoices tab
- [ ] All previous sprint tests still pass

---

## Sprint F12: Accessibility Audit

**Goal:** WCAG AA compliance across entire app. Spec Section 7.

### Task F12.1 — VoiceOver / TalkBack
- [ ] Audit EVERY interactive element — must have `accessible={true}`, `accessibilityLabel`, `accessibilityRole`
- [ ] Timer display: `accessibilityLiveRegion="assertive"` for real-time updates
- [ ] Buttons: descriptive labels ("Start timer for Project Alpha", not "Start")
- [ ] Add `accessibilityHint` for non-obvious actions ("Double-tap to start tracking")
- [ ] Status badges: accessible labels include status text ("Invoice 001, $3,500, status: paid")

### Task F12.2 — Touch Targets & Contrast
- [ ] Verify all touch targets are minimum 44×44pt (use layout inspector)
- [ ] Timer start/stop: 80×80pt
- [ ] Minimum 8px gap between adjacent interactive targets
- [ ] Run contrast check: all text meets 4.5:1 ratio (AA), UI components meet 3:1
- [ ] Verify in both Light and Dark mode

### Task F12.3 — Dynamic Type
- [ ] Test app at 200% font scale
- [ ] Fix any layouts that break (no fixed-height text containers)
- [ ] Set `maxFontSizeMultiplier={2.0}` as safety valve where needed
- [ ] Verify scrolling works at large text sizes

### Task F12.4 — Color-Blind Safety
- [ ] Verify all status indicators use color + icon + label (never color alone)
- [ ] Test with iOS color filters (Settings → Accessibility → Display → Color Filters)
- [ ] Paid/Overdue/Pending distinguishable without color

### 🧪 Validation Checkpoint — Sprint F12

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Manual smoke tests:**
- [ ] Turn on VoiceOver → navigate entire app. Every element announced correctly
- [ ] Timer updates announced via live region
- [ ] Enable iOS Large Text (200%) → app is usable, no cut-off text
- [ ] Enable Color Filters (Grayscale) → all statuses distinguishable by icon/label
- [ ] No touch target smaller than 44×44pt
- [ ] Timer button is 80×80pt

---

## Sprint F13: Polish & Integration Testing

**Goal:** Everything works together perfectly. Final polish before declaring frontend done.

### Task F13.1 — Cross-Screen Integration
- [ ] Full user journey test: onboarding → add client → track time → create invoice → mark paid → view reports
- [ ] Timer state persists across app kills and restarts
- [ ] Paywall limits work with new UI (3 clients, 10 invoices, 30-day history)
- [ ] Subscription status correctly toggles Pro features
- [ ] Biometric lock works with redesigned screens
- [ ] Export screen (from backend plan) accessible and styled correctly

### Task F13.2 — Performance Optimization
- [ ] Profile animations — verify 60 FPS on iPhone 12 equivalent
- [ ] App launch → interactive: < 2 seconds
- [ ] Timer start response: < 100ms
- [ ] Screen transitions: < 300ms
- [ ] List render (50 items): < 500ms
- [ ] Fix any jank or dropped frames

### Task F13.3 — Visual Polish
- [ ] Review every screen side-by-side with spec wireframes
- [ ] Consistent spacing throughout (8px grid)
- [ ] No orphaned styles from old design system
- [ ] Icons consistent (all Lucide, same stroke width)
- [ ] Loading states on all async operations
- [ ] Error states with user-friendly messages everywhere

### 🧪 Validation Checkpoint — Sprint F13 (FINAL)

```bash
npx tsc --noEmit
npx expo export --platform ios 2>&1 | tail -20
```

**Complete regression test — ALL must pass:**
- [ ] Fresh install → onboarding completes → lands on Timer
- [ ] Timer start/stop with animations + haptics
- [ ] Saved timers work (create, one-tap start, edit, delete)
- [ ] "Start X minutes ago" long-press works
- [ ] Timesheets list + calendar view
- [ ] Time entry CRUD via bottom sheet
- [ ] Weekly progress bar
- [ ] Invoice list with filters
- [ ] Uninvoiced time banner
- [ ] Invoice builder (4 steps)
- [ ] Invoice PDF generation
- [ ] Mark as Paid → FULL celebration
- [ ] Client list with search, sort, metrics
- [ ] Client detail with projects/activity/invoices
- [ ] Reports dashboard with charts
- [ ] Streak counter
- [ ] Achievement badges (earn at least one)
- [ ] Settings (theme, sounds, profile)
- [ ] Export screen
- [ ] Paywall (hit client limit → upgrade prompt)
- [ ] Biometric lock
- [ ] Dark mode — every screen
- [ ] Light mode — every screen
- [ ] VoiceOver navigation
- [ ] Large text (200%)
- [ ] Reduce Motion enabled
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] 60 FPS animations

---

## Post-Completion: Future UX Sprints

These build on the foundation above. Only start after Sprint F13 passes.

### Sprint F14: Visual Timeline View
- [ ] Hours-inspired horizontal color-coded bar showing day as blocks
- [ ] Tap to edit, drag edges to resize
- [ ] Third view toggle on Timesheets screen

### Sprint F15: Weekly Insights (Variable Rewards)
- [ ] Monday delivery of personalized stats
- [ ] Surprising data points ("You earned 23% more this week!")
- [ ] Push notification with insight preview

### Sprint F16: Persistent Timer Banner Enhancements
- [ ] Mini-player style with expand/collapse
- [ ] Quick note-add from banner
- [ ] Swipe to stop

### Sprint F17: Invoice Template Customization (IKEA Effect)
- [ ] Multiple invoice templates
- [ ] Custom color/font/logo options
- [ ] Preview before sending
- [ ] Creates ownership through personalization

### Sprint F18: Year in Review
- [ ] Annual summary: total hours, total earned, top clients, achievements
- [ ] Beautiful shareable card format
- [ ] Triggered in December/January

---

## Rules for Claude Code

1. **Read this file first** every session before writing any code
2. **Read `UX-REDESIGN-SPEC.md`** for all design details (colors, sizes, animations, layouts)
3. **Cross-reference both research docs** (`UX-RESEARCH-FOUNDATION.md` and `UX-RESEARCH-FOUNDATION-v2.md`) when you need deeper rationale
4. **Work on the next unchecked sprint** — don't skip ahead
5. **Run the validation checkpoint** after completing each sprint
6. **Report all test results** — pass or fail, no hand-waving
7. **If a test fails, fix it** before marking the sprint done
8. **Commit after each logical change** with clear commit messages
9. **Don't break existing features** — the backend (timer, DB, Stripe, paywall) must keep working
10. **Use the theme system** — NEVER hardcode colors, fonts, or spacing
11. **Every interactive element needs accessibility props** — this is not optional
12. **Haptics on every interaction** — buttons, tabs, swipes, celebrations
13. **Test both Light and Dark mode** for every screen you touch

---

*Last updated: February 8, 2026*
