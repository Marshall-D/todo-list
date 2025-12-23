# Todo List (React Native / Expo — Managed workflow)

## Short description

Small todo/test project built with **Expo (managed workflow)** to demonstrate React Native skills: UI, navigation, local persistence, native modules usage (voice recognition, datetime picker), styled components and a small custom voice-to-task flow.

---

## Important — build artifacts & testing options

> This project uses native libraries that are _not_ supported by the stock Expo Go app. For that reason you must either:
>
> 1. Install the **Dev Client** build (recommended for testing native features during development), OR
> 2. Install the **standalone APK** for a normal run of the app.

### **Dev Client (development build)**

- I have prepared a development client build to make testing simple. Download the Android dev client from this Google Drive link:
  **DEV CLIENT APK / DRIVE LINK:** `https://drive.google.com/file/d/1zrZYLXaLIugvA0Z8G-_qBY--wKPjqePN/view?usp=sharing`

### **Release APK (normal app install)**

- You can also test the app as a regular Android app, download the APK here:
  **RELEASE APK LINK:** `https://drive.google.com/file/d/1MJrRs3WfcuN0kDatI-yC4auBMGAwK8M3/view?usp=sharing`

> Note: On Android you may need to enable installation from unknown sources for the browser / Drive (see Troubleshooting -> "Install APK" below).
> Note: You cant have the 2 apps at the same time on a single device. unintsall the dev client before installing the normal apk.

---

## Native libraries used (major ones)

This project is primarily Expo-managed but uses several native modules. Key native libraries included:

- `expo-speech-recognition` — device speech recognition (interim + final results)
- `expo-dev-client` — to create a custom dev client that supports installed native modules
- `@react-native-async-storage/async-storage` — persistent local storage for tasks
- `@react-native-community/datetimepicker` — native date picker for due dates
- `@expo/vector-icons` — icons
- `@react-navigation/native` + `@react-navigation/native-stack` — navigation
- `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated` — navigation & UI primitives required by React Navigation and performance
- `expo-modules-core` / `expo` (managed SDK packages)

> If you inspect `package.json` you will find the exact versions used.

---

## Quick test steps (recommended)

### **Option A — Use the provided Dev Client (recommended)**

1. Install the dev-client APK on an Android device (see Troubleshooting for "Install APK").
2. On your machine: clone the repo and install deps:

   ```bash
   git clone https://github.com/Marshall-D/todo-list.git
   cd your-repo
   `npm install`

   Install expo-cli and eas-cli if you don't have them:
   ```

npm install -g expo-cli eas-cli

## Start the Metro server in dev-client mode:

npx expo start --dev-client

Open the expo go app and scan the barcode. it should then open up the installed dev client apk installed on your Android device and it should connect to the Metro server (your laptop and phone must be on the same network). If connection issues occur you can use "tunnel" mode from the Expo start menu.

### **Option B — Install the provided release apk**

Download the APK from the release link above.

Enable "Install unknown apps" for the browser/Drive app that will open the APK (see Troubleshooting).

Install and run the app. This is the simplest "as-installed-on-device" flow. No dev server required.

### **Option C — Build the dev client or apk yourself**

To build your own dev client or APK you need EAS build access (see "Build yourself" below).

## How to build the dev client or APK yourself

To build yourself you need: an Expo account and (for iOS) a macOS machine with Apple developer credentials to produce an iOS build.

Create or log in to an Expo account: expo login

Make sure you are in the project folder and eas.json is configured (this repo includes a sample eas.json).

Build a development client (Android example):

npx eas build --platform android --profile development

After the build finishes you will get a download link (or use eas build:view from the Expo dashboard).

Build a production APK:

npx eas build --platform android --profile production

### Access control / permissions

To build on your own you either need:

- Access to the Expo project (I can add your Expo account email to the project), or

- My Expo account credentials (not recommended). Best practice is for me to add you to the project on Expo so you can run builds under your account or an organization account.

## Voice input feature — how it works & limitations

### How it works

The app uses the device/OS speech recognizer (expo-speech-recognition) to capture interim and final transcripts.

The app collects the final transcript, runs normalization & splitting heuristics, and saves parsed task(s) to local storage.

### Limitations

Device/OS recognizers vary widely in accuracy. The current implementation is reliable for short inputs (1–2 short sentences) and single-line commands (e.g., "Buy milk, call Alice").

For long-form voice input (multi-sentence dictation or long monologues) the device recognizer sometimes:

- Drops earlier words, or

- Breaks results into partial/variant segments that are hard to combine reliably.

We did not add a paid cloud transcription model (OpenAI / Whisper, etc.) or a server-side pipeline — because that was out of scope for this exercise (the goal was to test React Native skills + native integration). If you want reliable, long-form transcription we recommend adding:

- A paid cloud model (OpenAI / Whisper / AssemblyAI / Google speech-to-text) or

- A small backend (Python/Node) that receives recorded audio, performs VAD + chunking, and calls a higher-quality model to transcribe reliably.

## How to test the voice feature (short checklist)

- Open the app.

- Tap the floating + -> Add by Voice.

- In the Voice modal: press Start, speak a short sentence like "Buy groceries", then press Stop. Confirm a task appears.

- Try a slightly longer input: "Buy bread and milk, call Sarah about the meeting". The app will attempt to split into tasks using commas / "and" etc. Results will vary — this demonstrates limitations described above.

## Troubleshooting

### Install APK on Android (unknown sources)

Android 8+:

Go to Settings → Apps & notifications → Special app access → Install unknown apps.

Select the app (Chrome / Drive / Files) you used to download the APK.

Enable Allow from this source.

Open the APK in the chosen app and install.

### Permissions

On first voice use the app will ask for microphone permission — allow it.

If audio or microphone doesn't work, check Android app permissions: Settings → Apps → Todo (your app) → Permissions.

### If the dev client won't connect to Metro

Ensure both device and dev machine are on same network; try expo start --tunnel.

If using VPN or corporate firewall, connect to same network or disable VPN for testing.

### If Gradle/EAS builds fail

Common causes: missing network/DNS or missing Maven access. Make sure build machine has stable internet and can access Maven Central. (If you ran into the Gradle error earlier, ensure network/DNS/proxy is fixed, then ./gradlew --refresh-dependencies or clear Gradle cache.)

## Project structure (brief)

`/app`
`/components` - UI components (TaskItem, AppModal)
`/hooks` - custom hooks (useTasks, useVoice)
`/screens` - TaskList, AddTask
`/providers` - Theme provider
`/utils` - storage helpers, theme tokens
`App.tsx` - entry / navigator

---

If you want to build the dev client yourself I can either:

- Add your Expo account (email) to the project so you can run eas build (recommended), or

- Temporarily share an Expo account for you to log in with (not recommended for security).
