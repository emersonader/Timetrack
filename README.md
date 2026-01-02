# Job Time Tracker

A React Native (Expo) mobile app for freelancers and contractors to track time spent on client jobs, manage clients, and generate/send invoices.

## Features

- **Client Management**: Add, edit, search, and manage client profiles
- **Time Tracking**: Start/stop timer with real-time display, persist across app restarts
- **Multiple Sessions**: Track multiple work sessions per client over different days
- **Invoicing**: Generate professional PDF invoices and send via email or SMS
- **Offline Support**: Full offline functionality for time tracking and client management
- **Persistent Notifications**: Timer continues in background with status updates

## Screenshots

```
┌─────────────────────────┐    ┌─────────────────────────┐
│   Job Time Tracker      │    │   Choose a Client       │
├─────────────────────────┤    ├─────────────────────────┤
│                         │    │ ┌─────────────────────┐ │
│  ┌───────────────────┐  │    │ │ 🔍 Search...        │ │
│  │ 👥 Choose Client  │  │    │ └─────────────────────┘ │
│  └───────────────────┘  │    │                         │
│                         │    │ ┌─────────────────────┐ │
│  ┌───────────────────┐  │    │ │ JD John Doe         │ │
│  │ ➕ Add Client     │  │    │ │    (555) 123-4567   │ │
│  └───────────────────┘  │    │ └─────────────────────┘ │
│                         │    │                         │
│  ┌───────────────────┐  │    │ ┌─────────────────────┐ │
│  │ 📄 Send Invoice   │  │    │ │ JS Jane Smith       │ │
│  └───────────────────┘  │    │ │    (555) 987-6543   │ │
│                         │    │ └─────────────────────┘ │
│  Recent Clients         │    │                         │
│  ┌────┐ ┌────┐         │    └─────────────────────────┘
│  │ JD │ │ JS │         │
│  └────┘ └────┘         │
└─────────────────────────┘

┌─────────────────────────┐    ┌─────────────────────────┐
│   Client Details        │    │   Send Invoice          │
├─────────────────────────┤    ├─────────────────────────┤
│ ┌─────────────────────┐ │    │ Invoice For             │
│ │ JD  John Doe        │ │    │ John Doe    [Change]    │
│ │     $75.00/hr       │ │    │ $75.00/hr               │
│ │     (555) 123-4567  │ │    ├─────────────────────────┤
│ └─────────────────────┘ │    │ Invoice Summary         │
│                         │    │ Total Hours    4.50 hrs │
│ ┌─────────────────────┐ │    │ Hourly Rate    $75.00   │
│ │  ● 02:34:56         │ │    │ ─────────────────────── │
│ │  [Stop Timer]       │ │    │ Total Amount   $337.50  │
│ └─────────────────────┘ │    ├─────────────────────────┤
│                         │    │ [📧 Send via Email]     │
│ Time Sessions           │    │ [💬 Send via SMS]       │
│ Dec 27, 2024            │    │ [📤 Share Invoice]      │
│ ┌─────────────────────┐ │    └─────────────────────────┘
│ │ 9:00 AM - 12:00 PM  │ │
│ │ 3h • $225.00        │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

## Tech Stack

- **React Native** with **Expo** (~52.0.0)
- **TypeScript** for type safety
- **SQLite** (expo-sqlite) for local data storage
- **React Navigation** for screen navigation
- **expo-notifications** for timer notifications
- **expo-print** for PDF invoice generation
- **expo-sharing** for sharing invoices
- **Fuse.js** for fuzzy client search
- **date-fns** for date formatting

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator, or Expo Go app on physical device

## Installation

1. **Clone and navigate to the project:**
   ```bash
   cd Timetrack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create placeholder assets:**
   ```bash
   # Create simple placeholder icons (or add your own)
   # The app requires these files in the assets folder:
   # - icon.png (1024x1024)
   # - splash-icon.png (1284x2778)
   # - adaptive-icon.png (1024x1024)
   # - favicon.png (48x48)
   # - notification-icon.png (96x96)
   ```

4. **Start the development server:**
   ```bash
   npx expo start
   ```

5. **Run on your device/simulator:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app for physical device

## Project Structure

```
Timetrack/
├── App.tsx                 # Entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── ClientCard.tsx
│   │   ├── TimeSessionCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── EmptyState.tsx
│   ├── screens/           # Screen components
│   │   ├── MainScreen.tsx
│   │   ├── ChooseClientScreen.tsx
│   │   ├── AddClientScreen.tsx
│   │   ├── EditClientScreen.tsx
│   │   ├── ClientDetailsScreen.tsx
│   │   └── SendInvoiceScreen.tsx
│   ├── db/                # Database layer
│   │   ├── database.ts
│   │   ├── clientRepository.ts
│   │   ├── sessionRepository.ts
│   │   └── invoiceRepository.ts
│   ├── hooks/             # Custom React hooks
│   │   ├── useTimer.ts
│   │   ├── useClients.ts
│   │   └── useSessions.ts
│   ├── services/          # Business logic
│   │   ├── invoiceService.ts
│   │   ├── shareService.ts
│   │   ├── notificationService.ts
│   │   └── timerPersistence.ts
│   ├── utils/             # Utilities
│   │   ├── constants.ts
│   │   ├── validation.ts
│   │   ├── formatters.ts
│   │   └── fuzzySearch.ts
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   ├── context/           # React Context
│   │   └── TimerContext.tsx
│   └── navigation/        # Navigation
│       └── AppNavigator.tsx
└── assets/                # Images
```

## Usage

### Adding a Client
1. Tap "Add a Client" on the main screen
2. Fill in client details (name, phone, email, hourly rate)
3. Tap "Save Client"

### Tracking Time
1. Tap "Choose a Client" and select a client
2. On the client details screen, tap "Start Timer"
3. The timer runs in the background with a notification
4. Tap "Stop Timer" when done

### Sending an Invoice
1. Tap "Send Invoice" on the main screen
2. Select a client (or access from client details)
3. Review unbilled sessions and total amount
4. Add an optional message
5. Choose to send via Email, SMS, or Share

## Database Schema

```sql
-- Clients
CREATE TABLE clients (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  email TEXT,
  hourly_rate REAL NOT NULL
);

-- Time Sessions
CREATE TABLE time_sessions (
  id INTEGER PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration INTEGER,
  date TEXT NOT NULL,
  is_active INTEGER
);

-- Invoices
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  total_hours REAL,
  total_amount REAL,
  sent_date TEXT,
  send_method TEXT,
  session_ids TEXT
);
```

## Building for Production

```bash
# Build for iOS
npx expo build:ios

# Build for Android
npx expo build:android

# Or use EAS Build (recommended)
npx eas build --platform ios
npx eas build --platform android
```

## License

MIT
