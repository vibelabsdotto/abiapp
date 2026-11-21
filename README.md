# AbiApp

Free, offline Abitur grade calculator for all 16 German states.

AbiApp tracks grades per half-year, predicts half-year results, picks the best possible course selection for Block I, calculates Block II and the final Abitur grade, and checks admission and pass conditions according to each state's official regulation. Everything stays on the device: no account, no cloud sync, no ads, no AI.

AbiApp replaces the earlier AbiSax app and ships under the same store listing.

## Features

- Grades per subject and half-year (exams and other grades, adjustable exam share), predictions with one decimal, official half-year results
- Exact Block I optimizer: mandatory inclusions, weighting variants, course count ranges and deficit limits per state, manual overrides
- Block II with state-specific exam variants, supplementary oral exams and rounding rules
- Final grade, admission and pass checklist, goal planning ("what do I need in my next exam?", "what average do I need for 1,5?")
- Onboarding without an account, JSON backup and restore, light and dark mode, German and English UI
- Native iOS and Android UI (Expo Router native tabs, native headers and context menus)

## Supported states

Rules cover the Abitur years from 2027; later years use the newest version of each state. Each version cites its legal sources in the app. Versions marked as draft are based on regulations that were not yet in force when they were written.

| State                  | Rule versions                      | Confidence                  |
| ---------------------- | ---------------------------------- | --------------------------- |
| Baden-Württemberg      | BW-2027, BW-2030                   | high / medium               |
| Bayern                 | BY-G9-2027                         | high                        |
| Berlin                 | BE-2027, BE-2028, BE-2029, BE-2030 | high / high / high / medium |
| Brandenburg            | BB-2027, BB-2028                   | medium / medium             |
| Bremen                 | HB-2027, HB-2030 (draft)           | high / low                  |
| Hamburg                | HH-2027, HH-2030 (draft)           | high / low                  |
| Hessen                 | HE-2027, HE-2030 (draft)           | high / low                  |
| Mecklenburg-Vorpommern | MV-2027, MV-2028                   | medium / high               |
| Niedersachsen          | NI-2027, NI-2030 (draft)           | high / low                  |
| Nordrhein-Westfalen    | NW-2027, NW-2030                   | high / high                 |
| Rheinland-Pfalz        | RP-2027, RP-2030                   | high / medium               |
| Saarland               | SL-2027, SL-2030 (draft)           | high / low                  |
| Sachsen                | SN-2027                            | high                        |
| Sachsen-Anhalt         | ST-2027                            | medium                      |
| Schleswig-Holstein     | SH-2027, SH-2028                   | high / high                 |
| Thüringen              | TH-2027                            | high                        |

Results are calculated with care but without guarantee. Your school and the state regulation are authoritative. Found a rule that is wrong or outdated? Please open an issue with the regulation and paragraph. See [docs/rulesets.md](docs/rulesets.md) for how rules are modeled.

## Tech stack

Expo SDK 58, React Native 0.88, Expo Router (native tabs), Zustand, expo-sqlite, i18n-js. The rules engine in `src/domain/` is plain TypeScript without React Native dependencies.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: VibeUpdate app ID, Featurama key
npx expo prebuild --clean    # generates ios/ and android/ (not committed)
npm start                    # Metro (dev client), port 8090; keep it running
npm run ios                  # build + launch the dev client on the iOS simulator
npm run android              # same for Android
```

OTA updates are code-signed (`certs/certificate.pem`), so Metro signs the development manifest with the matching private key (`ABIAPP_OTA_PRIVATE_KEY`, default `~/.config/vibeupdate/keys/abiapp/private-key.pem`). Without that key, generate your own pair locally and do not commit the new certificate: `npx expo-updates codesigning:generate --key-output-directory ~/.config/vibeupdate/keys/abiapp --certificate-output-directory certs --certificate-validity-duration-years 10 --certificate-common-name dev`.

Checks:

```bash
npm run type-check
npm run lint
npm test                     # Vitest, pure logic (src/domain, src/utils, src/services)
npm run format:check
npx expo-doctor
```

`ios/` and `android/` are generated (Continuous Native Generation). Make native changes through `app.config.ts` and the config plugins in `plugins/`.

Firebase Analytics is enabled only when `GoogleService-Info.plist` and/or `google-services.json` exist at prebuild time (repo root, or the absolute paths in `GOOGLE_SERVICE_INFO_PLIST` / `GOOGLE_SERVICES_JSON`). Without them the app builds normally and analytics calls are no-ops.

## Privacy

All grades and settings are stored locally on the device (SQLite and AsyncStorage). The app sends no grades, subject names or other personal data anywhere. The official builds use three services:

- Firebase Analytics: anonymous usage events and screen views with state, ruleset id, Abitur year, counts and enum values only (`src/services/analytics/appEvents.ts`), plus the device data Firebase collects itself.
- VibeUpdate: on start and on return to the app, asks whether a newer version or release notes exist (platform, app id, version, build number, device language).
- Featurama: only when you open "Feature requests"; loads the list and sends requests, votes and comments you write yourself, with a random voter id and device info (model, OS, screen, language, app version).

Privacy policy: https://vibelabs.to/de/privacy

## License

MIT, see [LICENSE](LICENSE). Built by [VibeLabs](https://vibelabs.to).
