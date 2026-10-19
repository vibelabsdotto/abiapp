# AbiApp – free, offline Abitur grade calculator for all German states

AbiApp calculates Abitur grades for all 16 German federal states. Everything
runs locally on the device (SQLite): no account, no cloud, no AI. It replaces
the earlier AbiSax app (.NET MAUI) and ships under the same store listing.

Built with Expo SDK 58, React Native 0.88, Expo Router (native tabs) and
Zustand.

## Setup

```bash
npm install
cp .env.example .env.local   # optional: VibeUpdate app ID, Featurama key
npx expo prebuild --clean    # generates ios/ and android/ (not committed)
```

Firebase Analytics is enabled only when `GoogleService-Info.plist` and/or
`google-services.json` exist in the repo root at prebuild time. Without them
the app builds normally and analytics calls are no-ops.

## Run

```bash
npm run ios        # build + install dev client, Metro on port 8090
npm run android    # same for Android
npm start          # Metro only (dev client), port 8090
```

## Checks

```bash
npm run type-check
npm run lint
npm run format:check
npx expo-doctor
```

`ios/` and `android/` are generated (Continuous Native Generation). Make
native changes through `app.config.ts` and config plugins only.

## License

MIT, see [LICENSE](LICENSE).
