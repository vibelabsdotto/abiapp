# Release und OTA

Store-Builds baut `vibe-release` (Repo `vibelabsdotto/vibe-release`), OTA-Updates gehen über `expo-updates` an VibeUpdate. Kein EAS.

|                    | Wert                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle-ID / Paket  | `com.max.mannstein.abisax` (unveränderlich, Update der App „AbiSax“)                                                                                                         |
| App Store Connect  | App `6450996587`, Team `ZY92V7S3F6`                                                                                                                                          |
| Play               | Konto VibeLabs UG, Track `internal`, Play App Signing aktiv                                                                                                                  |
| Android-Upload-Key | Vault `keystores/abiapp.keystore`, Passwort/Alias in `secrets/abiapp-release.env`                                                                                            |
| VibeUpdate         | `appdb_6f419bde82dd42e789358eb6ce0a2b8a`, public `app_UOuDoRKed8PQL3h5f4CiLu3Q`                                                                                              |
| OTA-Signatur       | `certs/certificate.pem` (im Repo), Schlüssel `~/.config/vibeupdate/keys/abiapp/private-key.pem`, Key-ID `main`; kein Backup, Verlust heißt: neues Zertifikat per Store-Build |

## Voraussetzungen im Checkout

`.env.local` mit `EXPO_PUBLIC_VIBEUPDATE_APP_ID`, `EXPO_PUBLIC_FEATURAMA_API_KEY`, `GOOGLE_SERVICE_INFO_PLIST`, `GOOGLE_SERVICES_JSON` (absolute Pfade in den Vault `secrets/abiapp/`). `release.json` `requiredEnv` bricht ohne sie ab. `asc auth status` und `gpc` angemeldet.

## Store-Build (ein Befehl je Plattform)

```sh
git fetch origin
vibe-release ios --ref origin/release/2.0
vibe-release android --ref origin/release/2.0
```

Der Runner baut genau diesen Commit in einem eigenen Worktree, nimmt Build-Nummer = Store-Maximum + 1, prüft Signatur, Version und Bundle, lädt nach TestFlight bzw. Play Internal hoch und wartet auf `VALID`. Vorher `--plan` zeigt die Nummern. Logs: `~/Library/Logs/vibe-release/abiapp-<zeit>/`. Danach die Nummern in `app.config.ts` (`ios.buildNumber`, `android.versionCode`) auf `release/2.0` committen, falls der Runner es nicht selbst konnte.

Zurücklesen (Skill `mobile-release`):

```sh
python3 <skill>/scripts/store_readback.py ios --app 6450996587 --version 2.0.0 --build <N>
python3 <skill>/scripts/store_readback.py android --package com.max.mannstein.abisax --version-code <M> --track internal
```

## OTA

Nur JS und Assets. Native Änderungen (Dependencies, `app.config.ts`, `plugins/`) brauchen einen Store-Build; die Runtime-Version ist der Fingerprint, ein OTA mit anderem Fingerprint kommt still nie an. Erstes OTA erst, wenn ein Store-Build mit `expo-updates` live ist. Onboarding-Änderungen erreichen neue Nutzer nur per Store-Build (Update greift ab dem zweiten Kaltstart).

```sh
python3 <skill>/scripts/release_guard.py <Commit des Store-Builds>
VU="node ~/Coding/vibeupdate/apps/cli/bin/vibeupdate.js"
$VU ota publish appdb_6f419bde82dd42e789358eb6ce0a2b8a ios --yes --project . \
  --private-key ~/.config/vibeupdate/keys/abiapp/private-key.pem --key-id main \
  --certificate certs/certificate.pem --message "2.0.0 OTA: <Inhalt>" --format json
# dasselbe mit android
python3 <skill>/scripts/ota_manifest_check.py app_UOuDoRKed8PQL3h5f4CiLu3Q ios <runtime> --expect-id <update-id>
```

Runtime je Plattform: `npx expo-updates runtimeversion:resolve --platform ios` (nur `runtimeVersion` lesen). Rollback: `$VU ota rollback … --yes` (signiertes Zurück auf das eingebettete Bundle) oder ein älteres Bundle neu veröffentlichen.

## VibeUpdate-Release (Update-Hinweis)

Je Store-Version eine Release mit beiden Targets, erst als Entwurf. Veröffentlichen je Plattform erst, wenn das Binary öffentlich installierbar ist (`$VU release publish … ios --mode optional --yes`). Neue Installationen sehen 24 h lang nur `required`-Hinweise.
