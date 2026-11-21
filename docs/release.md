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

Store-AABs nur über `vibe-release` bauen: frischer Git-Worktree, `npm ci`, `expo prebuild --clean`, kein Gradle-Build-Cache, `:app:createBundleReleaseJsAndAssets` läuft also immer neu. Ein inkrementeller Gradle-Build im eigenen Checkout überspringt diesen Task als `UP-TO-DATE`, wenn sich nur Bild-Assets geändert haben (z. B. `assets/icons/toolbar/*.xml`), und liefert dann alte Assets aus. Lokal deshalb `./gradlew :app:bundleRelease --rerun-tasks` oder vorher `npx expo prebuild --clean`. Beleg am Artefakt: `aapt2 dump xmltree <universal.apk> --file res/drawable-mdpi-v4/assets_icons_toolbar_pencil.xml` zeigt nur `fillColor`, kein `strokeWidth`.

Zurücklesen (Skill `mobile-release`):

```sh
python3 <skill>/scripts/store_readback.py ios --app 6450996587 --version 2.0.0 --build <N>
python3 <skill>/scripts/store_readback.py android --package com.max.mannstein.abisax --version-code <M> --track internal
```

## iCloud (Cloud-Backup)

Das Cloud-Backup nutzt den iCloud Key-Value-Store (`modules/abiapp-cloud`). `app.config.ts` setzt dafür das Entitlement `com.apple.developer.ubiquity-kvstore-identifier` = `$(TeamIdentifierPrefix)$(CFBundleIdentifier)`. Einen Container gibt es nicht und kein CloudKit.

- **App-ID:** Die Fähigkeit ICLOUD (Xcode-6-Variante) ist seit 21.11.2026 an `com.max.mannstein.abisax` aktiv (`asc bundle-ids capabilities list --bundle LD3J684Y4S`).
- **Profile:** Mit der Änderung wurde das Profil `com.max.mannstein.abisax AppStore 2026-11-21` (Build 23) **INVALID**. Neu angelegt ist `com.max.mannstein.abisax AppStore 2026-11-21 iCloud` (ID `XW582GU9HL`, ACTIVE, gewährt `ubiquity-kvstore-identifier: ZY92V7S3F6.*`).
  - `vibe-release` sucht ein aktives App-Store-Profil, das jedes Entitlement aus `ios/AbiApp/AbiApp.entitlements` enthält, und findet dieses.
  - Fehlt es, legt `vibe-release` eines mit dem Namen `<bundle> AppStore <Datum>` an. Am selben Tag wie ein ungültiges gleichnamiges Profil scheitert das mit „Multiple profiles found with the name“. Dann das ungültige Profil löschen oder ein Profil unter anderem Namen anlegen.
- **Bestehende Builds:** Build 23 ist schon signiert und von der Profiländerung nicht betroffen.
- **Simulator / Dev-Client:** Lokal ohne Team signiert („Sign to Run Locally“). Der KVS läuft dort ohne Apple-Account nur lokal, die App zeigt „Nicht bei iCloud angemeldet“.
- **Prüfen nach dem Store-Build:** `codesign -d --entitlements - <App>.app` zeigt den KVS-Schlüssel mit `ZY92V7S3F6.com.max.mannstein.abisax`.

## Android Auto Backup

`plugins/withAndroidBackupRules.js` setzt `allowBackup`, `fullBackupContent` (bis Android 11) und `dataExtractionRules` (ab 12). Gesichert werden `files/SQLite/`, `files/cloud-backup/`, `databases/RKStorage*`; Cache, `shared_prefs` (Firebase-Zustand), OTA-Dateien (`files/.expo-internal`) und `files/dev-cloud` nicht. Nachweis im Emulator mit lokalem Transport:

```sh
adb shell bmgr enable true
adb shell bmgr transport com.android.localtransport/.LocalTransport
adb shell bmgr backupnow com.max.mannstein.abisax
adb uninstall com.max.mannstein.abisax && adb install <apk>   # Restore beim Installieren
```

## Android-Upload-Key (Reset vom 21.11.2026)

Der Upload-Key der alten MAUI-App ist nicht auffindbar. Am 21.11.2026 gegen 01:05 wurde in der Play Console ein Reset auf den neuen Key beantragt (Grund „Upload-Key verloren“). Neues Zertifikat: SHA-1 `34:8C:B7:F8:55:5B:C1:27:29:9E:7C:8E:ED:2C:DB:DE:B6:D6:C3:58`. Der alte Key hatte SHA-1 `8C:D8:D5:62:CB:AB:52:82:33:4D:23:F0:8D:9E:91:0C:44:2F:F1:10`.

- **Aktiv?** Play Console → Protected with Play → Play-App-Signatur verwalten → „Upload key“ zeigt den neuen SHA-1, und der Hinweis „pending request“ ist weg. Google schickt außerdem eine Mail mit dem Datum, ab dem der neue Key gilt. Uploads davor lehnt Play mit falscher Signatur ab.
- **Zurückziehen** (falls der alte Keystore doch auftaucht): gleiche Seite → Upload key → „Cancel request“. Danach den alten Keystore als `keystores/abiapp.keystore` in den Vault legen und `secrets/abiapp-release.env` anpassen.
- **Upload nach der Freigabe:** `vibe-release android --ref origin/release/2.0` (frischer Build). Ein schon gebautes AAB lädt `gpc bundles upload -p com.max.mannstein.abisax --track internal --file <aab>` hoch, danach `store_readback.py android … --track internal`.

## OTA

Update-Verhalten und Code-Signing sind an `ABIAPP_STORE_BUILD=1` gebunden (`app.config.ts`, gesetzt über `release.json` `env`). Ohne das Flag: `updates.enabled: false`, kein Zertifikat, Metro braucht keinen Schlüssel. Das Flag gehört zur aufgelösten Config, also zum Fingerprint: Dev- und Store-Build haben verschiedene Runtime-Versionen, und **jeder `ota publish` und jedes `runtimeversion:resolve` läuft mit `ABIAPP_STORE_BUILD=1`**.

Nur JS und Assets. Native Änderungen (Dependencies, `app.config.ts`, `plugins/`) brauchen einen Store-Build; die Runtime-Version ist der Fingerprint, ein OTA mit anderem Fingerprint kommt still nie an. Erstes OTA erst, wenn ein Store-Build mit `expo-updates` live ist. Onboarding-Änderungen erreichen neue Nutzer nur per Store-Build (Update greift ab dem zweiten Kaltstart).

```sh
python3 <skill>/scripts/release_guard.py <Commit des Store-Builds>
VU="node ~/Coding/vibeupdate/apps/cli/bin/vibeupdate.js"
ABIAPP_STORE_BUILD=1 $VU ota publish appdb_6f419bde82dd42e789358eb6ce0a2b8a ios --yes --project . \
  --private-key ~/.config/vibeupdate/keys/abiapp/private-key.pem --key-id main \
  --certificate certs/certificate.pem --message "2.0.0 OTA: <Inhalt>" --format json
# dasselbe mit android
python3 <skill>/scripts/ota_manifest_check.py app_UOuDoRKed8PQL3h5f4CiLu3Q ios <runtime> --expect-id <update-id>
```

Runtime je Plattform: `ABIAPP_STORE_BUILD=1 npx expo-updates runtimeversion:resolve --platform ios` (nur `runtimeVersion` lesen). Rollback: `ABIAPP_STORE_BUILD=1 $VU ota rollback … --yes` (signiertes Zurück auf das eingebettete Bundle) oder ein älteres Bundle neu veröffentlichen.

## VibeUpdate-Release (Update-Hinweis)

Je Store-Version eine Release mit beiden Targets, erst als Entwurf. Veröffentlichen je Plattform erst, wenn das Binary öffentlich installierbar ist (`$VU release publish … ios --mode optional --yes`). Neue Installationen sehen 24 h lang nur `required`-Hinweise.
