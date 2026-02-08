# TODO Before Launch

## App Store Assets
- [ ] App icon (1024x1024 PNG, no transparency, no rounded corners) — set in app.json `expo.icon`
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max) and 6.1" (iPhone 15 Pro) — 3-6 each
- [ ] App description (keyword-optimized for ASO)
- [ ] Support URL

## Web Pages (gramertech.com)
- [ ] Privacy policy at gramertech.com/hourflow/privacy
- [ ] Terms of service at gramertech.com/hourflow/terms

## Dev Build + Manual Testing
- [ ] `eas build --profile development --platform ios` (new native module: expo-document-picker)
- [ ] Test multi-currency: add client with EUR/GBP, verify on invoices/reports
- [ ] Test export: CSV (sessions, invoices, clients, materials), Excel, backup/restore
- [ ] Test currency picker in Settings (Pro only)
- [ ] Test paywall blocks free users from non-USD currencies
- [ ] Test full user journey: sign up > add client > track time > invoice > share
- [ ] Test all 3 paywall limits (clients, invoices, history)
- [ ] Test 14-day trial flow
- [ ] Test Stripe subscription verification
- [ ] Test biometric lock/unlock
- [ ] Test offline (airplane mode) — everything should work
- [ ] Test on multiple iPhone sizes (SE, standard, Pro Max)

## Production Build & Submit
- [ ] `eas build --platform ios --profile production`
- [ ] Test production build on real device
- [ ] Fill in App Store Connect metadata (description, screenshots, pricing, legal URLs)
- [ ] Set pricing: Free with in-app subscription
- [ ] `eas submit --platform ios`
- [ ] Respond to any App Store review feedback
