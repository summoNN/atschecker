# ATS Checker

## Project structure

- `mobile/` — Expo mobile application.
- `backend/` — API, ATS services, CV processing, Gemini integration, and tests.

## Run locally

Start the backend from `backend/`:

```powershell
npm run dev
```

For Expo Go, set the backend address before starting the mobile app. Use the
computer's LAN IP when testing on a physical iPhone:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='http://192.168.1.10:4000'; npx expo start
```

Only the backend receives `GEMINI_API_KEY`. Never put it in an `EXPO_PUBLIC_*`
variable.
