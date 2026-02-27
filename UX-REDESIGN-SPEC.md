# HourFlow Frontend UX Redesign — Complete Implementation Specification

> **Context:** You are redesigning the HourFlow time tracking app (React Native / Expo / SQLite local-first). The parent company is GramerTech (gramertech.com). The tagline is "Track Time. Send Invoices. Get Paid." The current UI is basic and functional — you are starting from scratch on the design system. This document contains everything you need to implement a world-class frontend. Follow it precisely.

---

## 1. BRAND IDENTITY & DESIGN SYSTEM

### 1.1 Brand Positioning
HourFlow is a premium time-tracking + invoicing app for freelancers and small teams. The brand voice is: **confident, clean, empowering, never corporate.** Think Linear meets Cash App — obsessive precision with bold personality. Parent brand: GramerTech.

### 1.2 Signature Color: Electric Indigo
The primary brand color is **Electric Indigo `#6366F1`** — distinctive, professional, and rare in the time-tracking space (competitors use blue/green/orange). This is HourFlow's "Hyper Neon Green" equivalent from Cash App — the color people associate with the brand.

### 1.3 Complete Color Palette

**Light Mode:**

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#FFFFFF` | App background |
| `surface` | `#F8F8FC` | Cards, sheets |
| `surfaceElevated` | `#FFFFFF` | Modals, popovers (with shadow) |
| `primary` | `#6366F1` | CTAs, active timer, brand accent |
| `primaryHover` | `#4F46E5` | Button pressed state |
| `success` | `#059669` | Paid, complete, positive |
| `warning` | `#D97706` | Pending, due soon |
| `error` | `#DC2626` | Overdue, errors |
| `billable` | `#7C3AED` | Billable time indicator |
| `textPrimary` | `#111827` | Headlines, body text |
| `textSecondary` | `#6B7280` | Captions, labels |
| `textTertiary` | `#9CA3AF` | Placeholders, disabled |
| `border` | `#E5E7EB` | Dividers, card borders |
| `borderFocus` | `#6366F1` | Input focus ring |

**Dark Mode** (desaturate all colors ~20 points, NEVER invert):

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#0F0F1A` | App background (dark gray with indigo tint, NOT true black) |
| `surface` | `#1A1A2E` | Cards, sheets |
| `surfaceElevated` | `#252540` | Modals, popovers |
| `primary` | `#818CF8` | Desaturated primary |
| `primaryHover` | `#6366F1` | Button pressed |
| `success` | `#34D399` | Desaturated success |
| `warning` | `#FBBF24` | Desaturated warning |
| `error` | `#F87171` | Desaturated error |
| `billable` | `#A78BFA` | Desaturated billable |
| `textPrimary` | `#E5E7EB` | ~87% white opacity |
| `textSecondary` | `#9CA3AF` | ~60% white |
| `textTertiary` | `#6B7280` | ~38% white |
| `border` | `#2D2D4A` | Borders (lighter than surface) |
| `borderFocus` | `#818CF8` | Focus ring |

**Semantic Status Colors (both modes):**
- Running timer: `primary` (indigo pulse)
- Paid: `success` + ✓ checkmark icon
- Pending/Draft: `warning` + clock icon
- Overdue: `error` + ⚠ alert icon
- Billable: `billable` (purple) + $ icon
- Non-billable: `textSecondary` (gray)

**CRITICAL RULES:**
- Dark mode surfaces use tonal elevation (lighter = higher), NOT shadows
- Never use pure `#000000` for backgrounds — use `#0F0F1A`
- Never use pure `#FFFFFF` for dark mode text — use `#E5E7EB`
- All status indicators use **color + icon + label** triad (color-blind safe)
- Provide Light / Dark / System Default toggle. Default to System.

### 1.4 Typography
Use **Inter** as the primary typeface (built into Expo). Fallback: System default.

| Style | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `displayLarge` | 32 | 700 (Bold) | 40 | -0.5 | Dashboard hero numbers, earnings total |
| `displayMedium` | 28 | 700 | 36 | -0.3 | Section headers |
| `headlineLarge` | 24 | 600 (SemiBold) | 32 | -0.2 | Screen titles |
| `headlineMedium` | 20 | 600 | 28 | 0 | Card titles, client names |
| `titleMedium` | 16 | 600 | 24 | 0.1 | Subsection headers |
| `bodyLarge` | 16 | 400 (Regular) | 24 | 0.15 | Primary body text |
| `bodyMedium` | 14 | 400 | 20 | 0.15 | Secondary text, descriptions |
| `labelLarge` | 14 | 500 (Medium) | 20 | 0.1 | Buttons, tabs |
| `labelMedium` | 12 | 500 | 16 | 0.5 | Tags, badges, overlines |
| `caption` | 11 | 400 | 16 | 0.4 | Timestamps, metadata |

**Dark mode adjustment:** Use one weight lighter for body text (400 → 350 or use slightly lower opacity). Increase letter-spacing by +0.05.

Support Dynamic Type on iOS via `dynamicTypeRamp`. Never use fixed-height text containers. Set `maxFontSizeMultiplier={2.0}` as a safety valve.

### 1.5 Spacing & Layout
Use an **8px base grid**. All spacing values are multiples of 4 or 8:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Inline spacing, icon gaps |
| `sm` | 8px | Tight component spacing |
| `md` | 12px | Component internal padding |
| `lg` | 16px | Card padding, section gaps |
| `xl` | 24px | Section spacing |
| `2xl` | 32px | Major section breaks |
| `3xl` | 48px | Screen-level spacing |

**Card design:** 16px padding, 12px border-radius, 1px border (`border` token). In light mode, add subtle shadow `0 1px 3px rgba(0,0,0,0.08)`. In dark mode, NO shadows — use surface elevation via color.

**Touch targets:** Minimum 44×44pt (Apple HIG). Timer start/stop button: **80×80pt minimum**. Spacing between adjacent interactive targets: minimum 8px.

### 1.6 Iconography
Use **Lucide Icons** (available in React Native via `lucide-react-native`). Style: 24px default, 1.5px stroke width, rounded line caps. Active state: filled variant where available, otherwise primary color.

Key icons:
- Timer: `Play`, `Pause`, `Square` (stop)
- Navigation: `Clock`, `FileText` (invoices), `Users` (clients), `BarChart3` (reports), `Settings`
- Actions: `Plus`, `ChevronRight`, `Check`, `X`, `Edit3`, `Trash2`, `Send`, `Download`
- Status: `CheckCircle` (paid), `Clock` (pending), `AlertTriangle` (overdue), `DollarSign` (billable)

---

## 2. NAVIGATION & SCREEN ARCHITECTURE

### 2.1 Tab Bar (Bottom Navigation)
5 tabs with sliding indicator animation:

```
[Timer]  [Timesheets]  [Invoices]  [Clients]  [More]
```

- **Timer** — Primary screen. Always accessible. Shows current/recent timers.
- **Timesheets** — Time entries list with calendar/list toggle and weekly summary.
- **Invoices** — Invoice list with status filters (Draft, Sent, Paid, Overdue).
- **Clients** — Client list with project hierarchy.
- **More** — Reports, Settings, Profile, Achievements, Support.

**Tab bar animation:**
- Sliding indicator: `withSpring({ damping: 20, stiffness: 200 })` following active tab
- Active icon: scale to 1.15 with spring, switch to filled variant
- Label: fade in at 200ms
- Haptic: `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on switch
- Color: Active = `primary`, Inactive = `textSecondary`

**Persistent timer banner:** When a timer is running and user navigates away from Timer tab, show a **slim banner** (48px height) below tab bar or at top of screen showing: project color dot + project name + running duration + stop button. Tapping banner navigates to Timer screen.

### 2.2 Screen Architecture

```
App
├── Onboarding (value-first, before auth)
│   ├── Welcome
│   ├── Personalization (2 questions)
│   ├── Guided First Timer
│   ├── Aha Moment (auto-invoice)
│   └── Signup/Login
├── Main (tab navigator)
│   ├── Timer
│   │   ├── Active Timer View
│   │   ├── Saved Timers Grid
│   │   └── Recent Entries
│   ├── Timesheets
│   │   ├── List View (default)
│   │   ├── Calendar View
│   │   ├── Visual Timeline (Hours-inspired)
│   │   └── Time Entry Detail/Edit
│   ├── Invoices
│   │   ├── Invoice List
│   │   ├── Invoice Detail
│   │   ├── Invoice Builder (multi-step)
│   │   └── Payment Tracking
│   ├── Clients
│   │   ├── Client List
│   │   ├── Client Detail (projects, entries, invoices)
│   │   └── Client/Project Editor
│   └── More
│       ├── Reports Dashboard
│       ├── Weekly Summary
│       ├── Achievements/Badges
│       ├── Settings
│       └── Profile/Account
└── Modals & Sheets
    ├── Quick Timer Start (bottom sheet)
    ├── Time Entry Editor (bottom sheet)
    ├── Project Picker (bottom sheet)
    └── Celebration Overlays (full screen)
```

---

## 3. SCREEN-BY-SCREEN UX SPECIFICATIONS

### 3.1 Timer Screen (Home)
This is the most important screen. It should feel **alive** when a timer is running.

**Layout:**
```
┌─────────────────────────────┐
│ Good morning, [Name]     ⚙  │  ← Greeting + settings icon
│                              │
│  ┌──────────────────────┐    │
│  │  [Project Color]     │    │
│  │  Project Name        │    │  ← Active timer card (large)
│  │  Client Name         │    │
│  │                      │    │
│  │     02:34:12         │    │  ← Large timer display (displayLarge)
│  │                      │    │
│  │  $187.50 earned      │    │  ← Real-time billable amount
│  │                      │    │
│  │      [■ STOP]        │    │  ← 80×80pt stop button
│  └──────────────────────┘    │
│                              │
│  Saved Timers                │  ← Section header
│  ┌────┐ ┌────┐ ┌────┐       │
│  │ 🔵 │ │ 🟢 │ │ 🟣 │       │  ← Saved timer pills (one-tap start)
│  │Dev │ │Meet│ │Dsgn│       │
│  └────┘ └────┘ └────┘       │
│                              │
│  Recent                      │
│  ├─ Design Review  1:30  $   │  ← Recent entries list
│  ├─ API Integration 3:15 $   │
│  └─ Client Call    0:45  $   │
└─────────────────────────────┘
```

**When no timer is running:**
- Replace active timer card with a large **[▶ START]** button (80×80pt, `primary` color, pulsing glow)
- Show "What are you working on?" input field above the button
- Recent/saved timers become the primary focus

**Timer animations:**
- **Pulsing glow** while running: `withRepeat(withSequence(withTiming(1.08, { duration: 1200 }), withTiming(1, { duration: 1200 })), -1, true)` on the timer card
- **Start press:** Quick squeeze to 0.92 (80ms), bounce to 1.05 with `withSpring({ damping: 8, stiffness: 300 })`, settle to 1.0. Haptic: `impactAsync(Medium)`.
- **Stop press:** Scale to 0.9, color flash to `success`, Haptic: `notificationAsync(Success)`. Lottie checkmark animation (300ms). Card transitions to completed entry.
- **Number display:** Each digit rolls independently using `react-native-animated-rolling-numbers` with `Easing.out(Easing.cubic)` at 500ms.
- **Real-time earnings:** Number ticks up with rolling animation as timer runs. Green color. Format: `$XXX.XX`.

**"Start X minutes ago" feature:** Long-press the start button to reveal a time picker: "I actually started at [time]". This is a power-user favorite from Timery.

**Saved timers:** Grid of color-coded pills. One tap = start that timer immediately. Long press = edit. Maximum 8 visible. Each shows: project color dot, project name (truncated), client name small. Add new via "+" pill at end.

### 3.2 Timesheets Screen

**Default: List View**
```
┌─────────────────────────────┐
│ Timesheets        📅 📋 ═    │  ← Title + Calendar/List/Timeline toggles
│                              │
│ This Week: 32h 15m           │
│ ████████████████░░░░ 80%     │  ← Weekly progress bar (animated)
│ $2,412.50 billable           │
│                              │
│ Today, Feb 8                 │
│ ┌──────────────────────┐     │
│ │ 🔵 Design Review     │     │
│ │ ProjectX · 1:30 · $  │     │  ← Time entry card
│ │ 9:00am - 10:30am     │     │
│ └──────────────────────┘     │
│ ┌──────────────────────┐     │
│ │ 🟢 API Integration   │     │
│ │ ProjectY · 3:15 · $  │     │
│ │ 10:45am - 2:00pm     │     │
│ └──────────────────────┘     │
│                              │
│ Yesterday, Feb 7             │
│ ...                          │
└─────────────────────────────┘
```

**Calendar View:** Weekly grid with colored blocks per entry. Tap a day to see detail. Shows daily totals.

**Visual Timeline (inspired by Hours app):** Horizontal color-coded bar showing the day as colored blocks. Each block = a time entry. Width proportional to duration. Tap to edit. Drag edges to resize. This is a **Phase 2** feature but design the data model to support it from day 1.

**Time entry cards:**
- Swipe left to delete (with confirmation)
- Swipe right to duplicate/continue
- Tap to edit (opens bottom sheet)
- Show: project color, task name, project/client, duration, billable indicator, time range
- Staggered entry animation: `FadeInDown.delay(index * 60).duration(400).springify()`

**Weekly progress bar:** Animated fill from left. Color gradient from `primary` to `success` as approaching goal. Pair with `Haptics.impactAsync(Light)` when goal is reached. Show percentage and hours.

### 3.3 Invoice Screen

**Invoice List:**
```
┌─────────────────────────────┐
│ Invoices           [+ New]   │
│                              │
│ ┌──────────────────────┐     │
│ │  Uninvoiced Time     │     │
│ │  $1,240.00 across 3  │     │  ← Zeigarnik trigger
│ │  clients  [Create →] │     │
│ └──────────────────────┘     │
│                              │
│ [All] [Draft] [Sent] [Paid]  │  ← Filter tabs
│                              │
│ INV-001 · Client Name        │
│ $3,500.00 · Sent Feb 5       │
│ Due Feb 20 · ⏱ Pending       │
│                              │
│ INV-002 · Client Name        │
│ $2,100.00 · Paid Feb 3       │
│ ✓ Paid · 🎉                  │  ← Paid badge with celebration
└─────────────────────────────┘
```

**Invoice Builder (multi-step with progress):**
Step 1/4: Select Client → Step 2/4: Add Line Items (auto-populated from uninvoiced time) → Step 3/4: Review & Customize → Step 4/4: Send

Progress bar at top showing completion. Each step is a screen transition with shared element animations. Pre-populate line items from tracked time entries. Show running total with rolling number animation.

**Invoice Detail:**
- Professional preview of the invoice as it will appear to the client
- Status badge with color + icon
- Action buttons: Send, Download PDF, Mark as Paid, Edit
- Payment history timeline
- "Mark as Paid" triggers the **PEAK celebration** (see Section 4)

**Uninvoiced time banner:** Always visible at top of invoice list when there's uninvoiced billable time. This is a Zeigarnik effect trigger — creates cognitive tension that drives invoice creation.

### 3.4 Clients Screen

**Client List:**
- Cards showing: Client name, active projects count, total hours, total billed, uninvoiced amount
- Color-coded by client primary color (user-assigned)
- Sort by: Name, Total Hours, Uninvoiced Amount
- Search bar at top

**Client Detail:**
```
┌─────────────────────────────┐
│ ← Client Name                │
│                              │
│ Total Billed    Uninvoiced   │
│ $12,400         $840.00      │
│                              │
│ Projects (3)                 │
│ ├─ Website Redesign  🟢     │
│ ├─ Mobile App        🔵     │
│ └─ Brand Guide       🟣     │
│                              │
│ Recent Activity              │
│ ...                          │
│                              │
│ Invoices (5)                 │
│ ...                          │
└─────────────────────────────┘
```

### 3.5 Reports/Dashboard

**Weekly Summary (the "ending" that closes each work week):**
```
┌─────────────────────────────┐
│ Your Week in Review          │
│                              │
│     40h 15m tracked          │
│     ↑ 12% vs last week       │  ← Comparison (green if up)
│                              │
│     $3,012.50 earned         │  ← Rolling number animation
│                              │
│ [Donut Chart]                │  ← Time by project (color-coded)
│  Design: 45%                 │
│  Development: 35%            │
│  Meetings: 20%               │
│                              │
│ [Bar Chart]                  │  ← Daily hours (Mon-Sun)
│  Mon ████████  8.5h          │
│  Tue ██████    6.0h          │
│  ...                         │
│                              │
│ 🔥 15-day tracking streak!   │
│ 🏆 New badge: Week Warrior   │
└─────────────────────────────┘
```

Charts animate on entry: bars grow from bottom with staggered delay. Donut chart draws clockwise. All with spring physics.

### 3.6 More/Settings
- **Profile:** Name, avatar, company, hourly rate, currency
- **Appearance:** Light/Dark/System, accent color picker (optional Phase 2)
- **Notifications:** Timer reminders, invoice due dates, payment received
- **Sounds & Haptics:** Toggle on/off, volume
- **Data:** Export (CSV, PDF), Backup, Delete account
- **Achievements:** Badge gallery with progress
- **About:** Version, GramerTech link, Support

---

## 4. ANIMATIONS, HAPTICS & CELEBRATIONS

### 4.1 Core Animation Library Stack
```
react-native-reanimated (v3+) — Core engine, UI thread
react-native-gesture-handler — Touch/gesture
moti — Declarative wrapper
lottie-react-native — Vector celebrations
expo-haptics — Haptic feedback
react-native-animated-rolling-numbers — Financial tickers
```

### 4.2 Animation Specifications

**Button press (all buttons):**
```js
// Scale 0.95, spring back
withSpring(0.95, { damping: 15, stiffness: 400 })
// + Haptics.impactAsync(ImpactFeedbackStyle.Light)
```

**Tab bar indicator:**
```js
withSpring(targetX, { damping: 20, stiffness: 200 })
// Active icon: withSpring(1.15, same config)
```

**List entry stagger:**
```js
FadeInDown.delay(index * 60).duration(400).springify()
// Max 8-10 visible items animated
```

**Timer pulse (while running):**
```js
withRepeat(
  withSequence(
    withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
    withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
  ), -1, true
)
```

**Number rolling (financial displays):**
```js
// react-native-animated-rolling-numbers
duration: 600
easing: Easing.out(Easing.cubic)
// Individual digits roll independently
```

**Skeleton loading:**
```js
// Moti pulsing opacity
from={{ opacity: 0.4 }}
animate={{ opacity: 1 }}
transition={{ loop: true, duration: 1500, type: 'timing' }}
```

**Screen transitions:** Default slide (300ms). Important transitions: crossfade (250ms).

### 4.3 Celebration Tiers

| Event | Animation | Haptic | Sound |
|-------|-----------|--------|-------|
| Timer start | Quick squeeze + bounce | `impactAsync(Medium)` | Soft click (0.1s) |
| Timer stop | Checkmark Lottie (300ms) | `notificationAsync(Success)` | Satisfying "done" tone (0.2s) |
| Time entry saved | Subtle slide-in confirmation | `impactAsync(Light)` | None |
| Invoice created | Progress complete + glow | `impactAsync(Medium)` | Subtle whoosh (0.2s) |
| Invoice sent | Paper plane Lottie (600ms) | `notificationAsync(Success)` | Whoosh send (0.3s) |
| **Payment received** | **FULL CELEBRATION: Gold confetti Lottie (1.5s) + coin rain + amount display with rolling numbers + "Cha-ching!" sound + strong haptic pattern** | **Custom double-tap: `impactAsync(Heavy)` × 2 with 100ms gap** | **"Cha-ching" (0.5s)** |
| Weekly goal hit | Confetti burst + badge | `notificationAsync(Success)` | Celebration chime (0.3s) |
| Streak milestone | Badge animation + number | `notificationAsync(Success)` | Achievement tone (0.3s) |
| New badge earned | Badge flip reveal (400ms) | `impactAsync(Medium)` | Unlock tone (0.3s) |

**Payment received is THE PEAK MOMENT.** This should be the single most emotionally designed moment in the entire app. Full-screen Lottie overlay, gold/green confetti, the dollar amount rolling into view, a satisfying cha-ching sound. This moment drives word-of-mouth.

### 4.4 Reduced Motion Alternatives
When `ReduceMotion` is enabled:
- Replace all slide/bounce with instant crossfade (200ms opacity)
- Timer pulse → static glow indicator
- Celebrations → static badge + haptic only (no visual animation)
- Number rolling → instant update
- List stagger → instant render
- Keep haptics (they don't cause vestibular issues)

### 4.5 Sound Design Rules
- Timer start: 0.1s, warm click, very subtle (high frequency action)
- Timer stop: 0.2s, satisfying "done" tone
- Invoice sent: 0.3s, whoosh
- Payment received: 0.5s, "cha-ching" (rare, rich)
- Error: 0.2s, soft warning tone
- ALWAYS provide global mute in Settings
- App must work perfectly without any sound
- Sounds never exceed 0.3s longer than their animation

---

## 5. ONBOARDING FLOW

### 5.1 Value-First Onboarding (Before Signup)
Implement the Duolingo model: let users experience value BEFORE asking for registration.

**Screen 1 — Welcome:**
- Large: "Track Time. Send Invoices. Get Paid."
- Subtitle: "See how it works in 60 seconds"
- Single CTA: [Get Started] (primary button, full width)
- No signup, no login, no account creation

**Screen 2 — Two-Question Personalization:**
- "What do you do?" — Grid of options: Design, Development, Consulting, Writing, Marketing, Photography, Other
- "What matters most?" — Pill options: Track hours accurately, Invoice clients faster, See my earnings, All of the above
- Single question per screen, one tap each
- Progress dots at top (2/5)

**Screen 3 — Guided First Timer:**
- "Let's track your first hour"
- Pre-configured demo project with their selected profession
- Large [▶ START] button — user taps to start a real timer
- Timer runs for a few seconds (or user can tap stop whenever)
- Show real-time earnings ticking up based on a demo rate

**Screen 4 — The Aha Moment:**
- Timer stops → time entry created → **instantly** show a beautiful auto-generated invoice
- "That's it. Time tracked → invoice ready."
- The invoice preview should look PROFESSIONAL — branded, line-itemized, ready to send
- This is the moment the user understands HourFlow's value proposition
- Subtle celebration animation (confetti, glow)

**Screen 5 — Signup:**
- "Save your progress"
- [Continue with Apple] (primary, prominent)
- [Continue with Google]
- [Sign up with email]
- "Your tracked time is already saved"
- Signup feels like a small step, not a gate

### 5.2 Progressive Onboarding (Post-Signup)
Don't dump features. Reveal them contextually:
- **Day 1:** Core loop tutorial — timer + manual entry
- **Day 2:** Contextual tooltip: "Add your first real client" (when they open Clients tab)
- **Day 3:** Contextual tooltip: "Create your first invoice" (when they have uninvoiced time)
- **Week 2:** Reports introduction (when they have enough data)
- **Week 3:** Advanced features (recurring tasks, templates, widgets)

### 5.3 Empty States
Every empty screen is an onboarding opportunity:
- **No timers:** Illustration + "Tap ▶ to track your first hour" + pre-configured demo timer
- **No time entries:** "Your timesheet is waiting" + animated clock illustration + [Start Timer] CTA
- **No invoices:** Professional invoice mockup preview + "Your first invoice is one tap away after tracking time"
- **No clients:** "Add your first client to organize projects" + quick-add inline form
- **No reports:** Sample chart with placeholder data + "Track a few days to see your patterns"

All empty states use a soft illustration (consistent style), a clear actionable headline, and a single CTA button.

---

## 6. PSYCHOLOGICAL SYSTEMS

### 6.1 Streak System
Track consecutive workdays with time logged (exclude weekends by default, configurable).
- Display on Timer screen: "🔥 15-day streak"
- Milestone celebrations at: 7, 14, 30, 60, 90, 180, 365 days
- **Streak freezes:** 2 free per month (configurable). User can "freeze" a planned day off without breaking streak
- If streak at risk: Push notification "Your 15-day tracking streak is at risk — log today's hours"
- Streak breaks: Gentle messaging, not punitive. "Your streak reset to 0, but your total of 47 streak days is saved"
- Show longest streak vs. current streak

### 6.2 Achievement Badges
Tiered badge system:

**Beginner:**
- First Timer — Track your first hour
- Invoice Rookie — Create your first invoice
- Client Starter — Add your first client

**Consistency:**
- Week Warrior — 7-day tracking streak
- Monthly Master — 30-day streak
- Quarterly Champion — 90-day streak

**Volume:**
- Century Club — 100 hours tracked
- Revenue Milestone — $1K / $5K / $10K / $50K / $100K billed
- Invoice Pro — 10 / 50 / 100 invoices sent

**Efficiency:**
- Speed Demon — Invoice sent within 24 hours of tracking
- Quick Draw — Start a timer in under 3 seconds from app open
- Zero Gap — Full day tracked with no gaps

**Fun/Surprising (variable rewards):**
- Night Owl — Log time after 10pm
- Early Bird — Log time before 7am
- Weekend Warrior — Track time on Saturday or Sunday
- Multi-Tasker — 5+ different projects in one day
- Marathon — Single timer over 8 hours

Badge design: Circular, color-coded by tier (bronze/silver/gold/platinum). Locked badges show grayed silhouette with progress indicator. Earning a badge triggers flip reveal animation + achievement tone + haptic.

### 6.3 Progress & Zeigarnik Triggers
Always-visible incomplete states that create return motivation:
- Weekly hours progress ring on Timer screen (e.g., "32/40h" = 80%)
- Uninvoiced amount badge on Invoices tab icon
- "2 draft invoices ready to send" notification dot
- Onboarding checklist: Start at 20% complete (endowed progress effect)
- Monthly billing progress: "$3,200 / $5,000 target"

### 6.4 Weekly Insights (Variable Rewards)
Deliver surprising, personalized data every Monday:
- "You earned 23% more this week!"
- "Your most productive day was Wednesday (9.2 hours)"
- "You tracked 3 new projects this week"
- "Fun fact: You've earned $1,240 since joining — that's a vacation budget!"

The unpredictable, personalized nature creates anticipation and return visits.

---

## 7. ACCESSIBILITY REQUIREMENTS

### 7.1 Non-Negotiable (Ship with MVP)
- **Contrast:** WCAG AA minimum (4.5:1 text, 3:1 UI components). All palette colors above pass.
- **Touch targets:** 44×44pt minimum, 80×80pt for timer. 8px minimum gap between targets.
- **VoiceOver/TalkBack:** Every interactive element has `accessible={true}`, `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`. Timer: `accessibilityLiveRegion="assertive"` for updates.
- **Reduce Motion:** Detect via `ReduceMotion.System` in Reanimated. Replace motion with crossfade.
- **Dynamic Type:** Support via `dynamicTypeRamp`. Test at 200% scale. No fixed-height text containers.
- **Color-blind safe:** All status indicators use color + icon + label triad. Never rely on color alone.
- **Keyboard/Switch Control:** Full navigation support for iPad/accessibility users.

### 7.2 Phase 2 Accessibility
- High contrast mode detection and enhanced palette
- Voice input for timer start ("Start timer for Design Review")
- Accessibility-adaptive onboarding (detect screen reader → adjust flow)
- Screen reader optimized charts (tabular data alternative)

---

## 8. TECHNICAL IMPLEMENTATION NOTES

### 8.1 Theme System Architecture
Create a centralized theme provider using React Context:

```typescript
// theme/tokens.ts — Single source of truth for all design tokens
// theme/ThemeProvider.tsx — Context provider with useColorScheme() detection
// theme/useTheme.ts — Hook returning current palette + typography + spacing
```

All colors, typography, and spacing accessed via `useTheme()` hook. NEVER hardcode colors in components. The theme system should support:
- Light/Dark/System modes
- Smooth transition between modes (200ms crossfade)
- Future: custom accent colors, high contrast mode

### 8.2 Animation Architecture
Create reusable animation primitives:

```typescript
// animations/pressable.ts — AnimatedPressable with scale + haptic
// animations/stagger.ts — Staggered list entry wrapper
// animations/skeleton.ts — Skeleton loading component
// animations/celebrate.ts — Celebration overlay system
// animations/rollingNumber.ts — Financial number display
```

### 8.3 Component Library (Build These)
Core components to build as a design system:

- `Button` — Primary, Secondary, Ghost, Destructive variants with press animation + haptic
- `Card` — Elevated surface with border, consistent padding
- `Badge` — Status badges with color + icon
- `ProgressBar` — Animated fill with gradient
- `ProgressRing` — Circular progress for weekly goals
- `TabBar` — Bottom navigation with sliding indicator
- `BottomSheet` — Modal bottom sheet for editors
- `TimerDisplay` — Large rolling number display
- `TimeEntryCard` — Swipeable time entry with project color
- `InvoiceCard` — Invoice summary with status badge
- `ClientCard` — Client summary with metrics
- `EmptyState` — Illustration + headline + CTA template
- `StreakBadge` — Flame icon + count with animation
- `AchievementBadge` — Circular badge with lock/unlock states
- `Skeleton` — Loading placeholder with shimmer
- `Input` — Text input with focus ring animation
- `Select` — Picker with bottom sheet
- `Toast` — Success/error notification toast

### 8.4 Data Model Considerations for UX
The design requires these data relationships (ensure SQLite schema supports):
- Time entries → belong to project → belong to client
- Time entries → can be marked billable/non-billable
- Time entries → can be linked to invoice line items
- Invoices → have status (draft/sent/viewed/paid/overdue)
- Users → have streaks (current, longest, freeze count)
- Users → have badges (earned, progress toward next)
- Users → have preferences (theme, sounds, haptics, streak config)
- Saved timers → quick-start configurations

### 8.5 Performance Targets
- App launch → interactive: < 2 seconds
- Timer start response: < 100ms (perceived instant)
- Screen transition: < 300ms
- List render (50 items): < 500ms
- Animation frame rate: 60 FPS minimum on iPhone 12 / mid-range Android
- Offline-first: All core features work without network

---

## 9. IMPLEMENTATION PHASES

### Phase 1 — MVP (Build Now)
1. Theme system (tokens, provider, useTheme hook)
2. Core component library (Button, Card, Input, etc.)
3. Tab navigation with animated indicator
4. Timer screen (start/stop, saved timers, recent entries)
5. Time entry CRUD with bottom sheet editor
6. Basic invoice list and creation flow
7. Client management (list + detail)
8. Dark/light mode with system detection
9. Value-first onboarding (5 screens)
10. Timer animations (pulse, start/stop, rolling numbers)
11. Haptic feedback on all interactions
12. WCAG AA accessibility throughout
13. Empty states for all screens

### Phase 2 — Engagement (Next Sprint)
14. Celebration system (all tiers from Section 4.3)
15. Streak tracking with freezes
16. Achievement badges (first 10)
17. Weekly summary with charts
18. Sound design integration
19. Skeleton loading states
20. Staggered list animations
21. Progress bars and rings
22. Uninvoiced time Zeigarnik triggers
23. Persistent timer banner

### Phase 3 — Delight (Following Sprint)
24. Visual timeline view
25. Widget + Live Activities + Dynamic Island
26. Invoice template customization (IKEA effect)
27. Weekly insights (variable rewards)
28. Full badge gallery (all tiers)
29. Shared element transitions
30. Year in Review
31. AI-suggested time entries
32. A/B testing framework

---

## 10. DESIGN THESIS — THE THREE PRINCIPLES

Every design decision should be evaluated against these three principles:

**1. Make the mundane feel meaningful.**
Time tracking feels like surveillance. HourFlow reframes it as personal empowerment — real-time earnings, billing celebrations, productivity insights. The payment received moment is the emotional centerpiece.

**2. Earn attention through speed and craft, not tricks.**
Linear proved obsessive precision (alignment, animation timing, interaction speed) drives organic growth. Users don't see pixel-perfect alignment — they feel it. Combined with genuine dopamine design, HourFlow becomes an app people recommend unprompted.

**3. Accessibility is a design amplifier, not a constraint.**
Every accessibility decision (larger targets, clearer contrast, haptic confirmations, reduced-motion alternatives) makes the app better for ALL users. Design for the edges; the center benefits.

---

**Parent company:** GramerTech (gramertech.com)
**Product:** HourFlow
**Tagline:** Track Time. Send Invoices. Get Paid.
**Stack:** React Native, Expo, SQLite (local-first), TypeScript
**Repo:** The existing codebase in this project directory

---

## REFERENCE: UX Research Foundation

For the full research backing this specification — including competitor deep-dives, dopamine psychology studies, color science, micro-interaction patterns, and onboarding psychology — see:

**`UX-RESEARCH-FOUNDATION.md`** in this repository.

That document contains:
- Part 1: Best-in-class app design analysis (Cash App, Linear, Duolingo, Robinhood, etc.)
- Part 2: Dopamine-driven design patterns with peer-reviewed research
- Part 3: Subliminal UX psychology and persuasion techniques
- Part 4: Dark mode and light mode color science
- Part 5: Micro-interactions and animation patterns for React Native/Expo
- Part 6: Time tracking app UX — what users love and hate
- Part 7: Accessibility that enhances design for everyone
- Part 8: Onboarding psychology and the aha moment
