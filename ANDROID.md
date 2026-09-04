# Building the CounterBook Android APK

The Android shell (in `android/`) loads the published web app from
`https://bill-pro-mate.lovable.app` (see `capacitor.config.ts`).

## One-time setup (on your computer)
1. Install Android Studio (with SDK 34+) and JDK 17.
2. Clone this repo and run `bun install` (or `npm install`).

## Build the APK
```bash
npx cap sync android          # copies config into the Android project
npx cap open android          # opens Android Studio
```
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
The debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`.

Or from the terminal:
```bash
cd android && ./gradlew assembleDebug
```

## Release build
Create a signing key, then **Build → Generate Signed Bundle / APK** in Android Studio.

## Testing against a local dev server
Temporarily change `server.url` in `capacitor.config.ts` to your machine's IP
(e.g. `http://192.168.1.10:8080`) and set `cleartext: true`, then run
`npx cap sync android`. Revert before making a release build.

## PWA
The web app is also installable from Chrome/Safari ("Add to Home Screen") via
`public/manifest.webmanifest` — it opens full-screen with a teal splash screen.
