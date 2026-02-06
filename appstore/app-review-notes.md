# App Review Notes — HourFlow

> For the Apple App Review team. Paste into the "Notes" field in App Store Connect.

---

## Review Notes

```
Thank you for reviewing HourFlow!

WHAT THIS APP DOES:
HourFlow is a time tracking and invoicing app designed for freelancers, independent contractors, and tradespeople (plumbers, electricians, handymen, etc.) who bill clients by the hour.

NO LOGIN REQUIRED:
This app does not require account creation or login. All data is stored locally on-device using SwiftData. There are no backend servers, no user accounts, and no cloud sync. The app is fully functional offline.

SUBSCRIPTION (PREMIUM):
The app offers a freemium model:
- Free tier: Unlimited time tracking, up to 3 clients, full invoicing
- Premium tier: Unlocks unlimited clients

The subscription is managed via StoreKit 2 / RevenueCat. No external payment processing occurs within the app — payment links on invoices (PayPal, Venmo, Zelle, Cash App) are simply URLs that open the respective apps or websites. HourFlow does not process payments.

HOW TO TEST:
1. Open the app — no login or setup required
2. Tap "Add Client" and create a test client (e.g., "John Smith")
3. From the client screen, tap the play/start button to begin tracking time
4. Let the timer run for a few seconds, then tap stop
5. Tap "Create Invoice" to generate an invoice from tracked time
6. Preview the invoice and use the Share button to see sharing options
7. Explore the dashboard to see earnings summaries
8. Try adding tags to organize your time entries

PAYMENT LINKS NOTE:
The invoices include optional payment links (PayPal, Venmo, Zelle, Cash App). These are user-configured URLs that appear on the invoice PDF/share sheet. The app does not process any financial transactions — it simply generates a link the invoice recipient can tap to pay via their preferred app. This is no different from writing "Pay via Venmo: @username" on a paper invoice.

DARK MODE:
The app supports both light and dark mode and follows the system setting.

PRIVACY:
No data leaves the device. No analytics, no tracking, no telemetry. See our Privacy Policy for details.
```

---

## Demo Account Credentials

```
No login required — the app works immediately upon launch with no account creation.
```

---

## Additional Notes

- **Minimum OS:** iOS 17.0
- **Frameworks:** SwiftUI, SwiftData, StoreKit 2, PDFKit
- **Third-party SDKs:** RevenueCat (for subscription management only)
- **Background modes:** None
- **Special permissions:** None (no camera, location, contacts, notifications, etc.)
- **App Tracking Transparency:** Not required — no tracking whatsoever

---

*Last updated: 2026-02-06*
