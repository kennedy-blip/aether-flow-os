# AetherFlow OS

A local-first spatial workspace for the web and Android. The same React app powers both: notes and tasks, procedural audio, a focus timer, an encrypted vault, and local diagnostics.

## Run locally

```sh
npm ci
npm run dev
```

Use the phone icon to preview the mobile dock. Open **Privileges** to try the Architect Pro and Root System Admin features. `Ctrl/Cmd + K` opens workspace search. The production build caches its shell after the first successful online visit; data is stored in IndexedDB. Vite's development server does not register the offline worker.

## Data and security

- Notes, focus sessions and simulated sync events are scoped to the current browser origin or Android app. **There is no cloud backend or cross-device replication.** Explorer notes are local-only; elevated roles can enqueue new changes and replay them locally.
- The vault encrypts both note titles and contents using AES-GCM with a key derived from a user-chosen PIN **and** a passphrase via PBKDF2. A four-digit PIN alone is not sufficient protection against offline guessing. There is no reset or recovery key. Vault authentication is separate from the feature-tier switcher; the biometric control is a labeled simulation and does not unlock anything.
- Sensor, haptic, and durable-storage access depend on device/browser support. The Eco Glass mode reduces rendering work; actual frame rate depends on hardware.

## Build Android and deploy to Vercel

With Node.js 22, Java 17, and Android SDK platform/build tools 34 installed:

```sh
npm ci
bash scripts/build-android.sh
```

This builds the web app, synchronizes Capacitor, assembles a **debug-signed universal APK**, writes the APK and its SHA-256 manifest under `public/releases/`, then rebuilds `dist/` to serve both. Deploy that final `dist/` folder to Vercel. The debug APK is for sideloading, not Play Store distribution.

The **Build and bundle Android APK** GitHub Actions workflow publishes the binary and combined web artifacts.

An ordinary `npm run build` works without Android tooling. Until the APK is published, the web button downloads a clearly labeled installation companion instead of a broken or counterfeit APK. The QR code opens the download center on the same web origin; use a public deployment URL if the phone cannot access your preview.

Production Vercel builds fetch the APK from the GitHub release tagged `android-<commit>`, verify its checksum, and bundle it before compiling the site. This path does not require Vercel secrets in GitHub Actions. If a deploy times out waiting for the APK, retry the deploy after the Android workflow completes.
