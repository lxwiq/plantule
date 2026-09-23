<p align="center">
  <img src="docs/plantule.png" width="160" alt="Plantule's mascot: a smiling terracotta pot with a sprout">
</p>

<h1 align="center">Plantule</h1>

<p align="center">
  <b>A private, offline plant care app for Android, with an AI plant expert that runs on your phone.</b><br>
  No account, no server, no ads: your plants, your phone.
</p>

<p align="center">
  <a href="https://github.com/lxwiq/plantule/releases/download/preview/plantule-preview.apk"><img alt="Download the APK" src="https://img.shields.io/badge/Download-APK-2E6B3E?style=for-the-badge&logo=android&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://github.com/lxwiq/plantule/actions/workflows/android.yml"><img alt="Android build" src="https://github.com/lxwiq/plantule/actions/workflows/android.yml/badge.svg"></a>
  <img alt="Platform: Android" src="https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white">
  <img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white">
  <img alt="On-device AI: Gemma 4" src="https://img.shields.io/badge/AI-Gemma%204%20on--device-4285F4">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

*Plantule* is French for **seedling**. Open the app, see what your plants need today, tick it off, and it's rescheduled. That loop is the heart of the app; everything else helps you get it right.

> The app's interface is in French.

## Features

### Daily care
- **Today screen**: what's overdue, what's due today, what's done, and what's coming up this week.
- **Quick actions**: mark as done, snooze, or tell the app the soil is still wet (watering moves 2 days later; after twice in a row, Plantule suggests a longer interval).
- **Sliding schedules**: the next date counts from the day you actually did it, not from a fixed calendar. From November to February, intervals stretch automatically for winter.
- **Daily summary notification** at the time you choose ("3 plants to water").
- **Month calendar** with the planned care for each day, and the journal for past days.
- **Journal**: every watering, feeding and repotting, plant by plant.

### Plants and places
- **Several places** (flat, country house…), each with its rooms and zones: light exposure, indoor or outdoor.
- **Plants** with nickname, species, room, arrival date, pot, substrate, notes and photos.
- **Growth gallery**: dated photos sorted by month, first vs. latest photo side by side ("8 months later"), full-screen viewer.
- **Cuttings**: follow each cutting from start to roots to potting, then turn it into a plant in one tap.
- **Wishlist**: the species you'd like to have, with light, watering and pet-safety info to help you decide.

### An AI plant expert on your phone
Plantule runs **Gemma 4 E2B** locally with Google's LiteRT-LM. The model is downloaded once (2.6 GB, over Wi-Fi) and **no photo ever leaves the phone**.
- **Scan**: take a photo and get the species, a confidence level and alternatives, then a complete care sheet and a ready-made care schedule.
- **Reads the photo**: pot material and size, whether it needs repotting (and why), and visible issues like yellow leaves or spots.
- **Health diagnosis**: a close-up of what worries you gives the plant's state (healthy, keep an eye on it, needs care), up to 3 likely causes and what to do now. It takes your recent waterings, the room and the season into account, and if watering is the cause, it offers to change the interval in one tap.
- **Ask Plantule**: chat about any of your plants; the answer streams in and the conversation is kept per plant.
- **Placement help**: the light the plant likes and which of your rooms offer it.
- **Reference base of 170 common plants**: names checked against Wikidata and pet toxicity from the ASPCA lists, so the AI doesn't make up the numbers.

### Around the app
- **Rain-aware watering**: give a place a town, and outdoor plants count as watered after a rainy day (5 mm or more), with weather from Open-Meteo.
- **Home-screen widget** with today's care.
- **Phone calendar**: add your plant care to your phone's calendar, kept in sync automatically.
- **Backup**: export everything (plants, photos, care, journal) to a single file and import it on a new phone.
- **In-app updates** straight from GitHub Releases.
- **Light and dark themes.**

## Privacy

Everything lives on your phone, in a local SQLite database, with photos in the app's own folder. There is no account and no server. The app only goes online to:

- download the AI model, once;
- fetch the weather for a place you gave a town to (only rounded coordinates are sent, to Open-Meteo);
- check GitHub for a new version of the app.

## Install

1. Download the [latest APK](https://github.com/lxwiq/plantule/releases/download/preview/plantule-preview.apk) on your Android phone and open it (Android will ask you to allow installs from your browser).
2. Later versions show up in the app itself: tap "Mettre à jour" (update) and confirm.

The AI features need a phone with at least 6 GB of RAM and 2.6 GB of free space. Everything else works on any recent Android phone, with or without the model.

## Tech

- [Expo](https://expo.dev) SDK 57, React Native 0.86, Expo Router, React Compiler
- `expo-sqlite` with migrations and reactive queries
- [`react-native-litert-lm`](https://github.com/hung-yueh/react-native-litert-lm) (Google's [LiteRT-LM](https://github.com/google-ai-edge/LiteRT-LM)) running Gemma 4 E2B on the device
- [`react-native-android-widget`](https://github.com/sAleksovski/react-native-android-widget), `expo-calendar`, `expo-notifications`
- [Open-Meteo](https://open-meteo.com) for the weather
- APKs built and signed by GitHub Actions (no EAS)

## Development

```bash
npm install
npx expo start      # then press "a" for Android
npm test            # unit tests (scheduling, dates, care sheets, diagnosis, backup, weather…)
npx tsc --noEmit    # typecheck
npx expo lint       # lint
```

The AI and the widget need the native modules of the APK: they don't work in Expo Go or in a browser. To try the AI screens anyway, run `EXPO_PUBLIC_FAKE_AI=1 npx expo start` and a fake model answers instead of Gemma.

```
src/app/            screens (Expo Router)
src/ai/             on-device model (download, runtime) and the expert's prompts (scan, sheet, diagnosis, chat)
src/components/     components, with the design system in components/ui
src/data/           plant reference base (care numbers, toxicity)
src/db/             SQLite: schema and migrations, queries, reactive hooks, backup
src/lib/            pure logic and its tests: scheduling, dates, care sheets, diagnosis, weather, updates…
src/notifications/  daily summary
src/widget/         home-screen widget
src/agenda/         phone calendar sync
src/weather/        Open-Meteo client
src/updates/        in-app updates
src/theme/          colors, typography, spacing (light and dark)
```

The database schema lives in `src/db/database.ts`. To change it, append a migration at the end of `MIGRATIONS`; never edit one that has shipped.

### In a browser

The web build is for development only. `expo-sqlite` needs the `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin` headers on the page, which Expo's dev server doesn't add to the HTML page, so you need a small local proxy that adds them. Also, `expo-sqlite` 57.0.3 truncates synchronous query results larger than 255 bytes on the web. Android isn't affected.

### Releases

APKs are built by GitHub Actions, not EAS (see `.github/workflows/android.yml`). Typecheck, lint and tests run first.

- Every push to `main` publishes a test APK to the [`preview` release](https://github.com/lxwiq/plantule/releases/tag/preview).
- A `vX.Y.Z` tag (matching `expo.version` in `app.json`) publishes a versioned APK and an AAB.

Each APK comes with an `update.json` file that the app reads to update itself.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) (in French). Next up: an iOS version.

An earlier version synced data between the members of a household through a Rust API (Axum, Postgres). It's kept on the `backend-rust` branch.

## License

[MIT](LICENSE)
