# AGENTS.md

Arbeitsregeln für Agents in diesem Repo. Führende Quelle für Projektkontext; bei Änderungen an Architektur, Befehlen oder Regeln hier pflegen.

## Projekt

AbiApp ist ein kostenloser Abiturrechner für alle 16 Bundesländer (Expo SDK 58, React Native, Expo Router mit NativeTabs, Zustand, expo-sqlite). Alles läuft lokal auf dem Gerät: kein eigenes Konto, kein eigenes Backend, keine KI. Ein automatisches Backup liegt im eigenen iCloud- bzw. Google-Konto des Schülers. Die App ersetzt AbiSax und läuft unter derselben Store-Identität `com.max.mannstein.abisax` (iOS und Android). Open Source unter MIT.

## Befehle

```bash
npm install                 # führt patch-package aus
npx expo prebuild --clean   # erzeugt ios/ und android/ (nicht eingecheckt)
npm run ios                 # Dev-Client bauen + starten, Metro auf Port 8090
npm run android
npm start                   # nur Metro (Dev-Client), Port 8090
npm run type-check
npm test                    # Vitest, reine Logik (src/domain, src/utils, src/services)
npm run lint                # ESLint + Kontrast- und Menü-Icon-Check
npm run format:check
```

Metro läuft immer auf **8090** (8081–8083 gehören anderen Projekten). Laufzeit-Eval in der laufenden Dev-App: `node scripts/app-eval.mjs <ausdruck.js> '<Simulatorname>'`; Dev-Helfer unter `globalThis.__abiapp` (`seedDemoData({ state, abiturYear })`, `backup`, `cloud`, `setup`, `stores`); `cloud.simulateOtherDevice({ concurrent })` spielt ein zweites Gerät gegen den Testordner-Anbieter.

## Release und OTA

- Store-Builds: `vibe-release both` im App-Root (liest `release.json`, baut einen Commit in eigenem Worktree, lädt nach TestFlight und Play Internal). Ablauf und Belege: [docs/release.md](docs/release.md).
- OTA: `expo-updates` gegen VibeUpdate (App „AbiApp“), `runtimeVersion` per Fingerprint, Manifeste signiert (`certs/certificate.pem`, Schlüssel `~/.config/vibeupdate/keys/abiapp/private-key.pem`, Key-ID `main`). Nur JS/Assets per OTA, alles Native per Store-Build. Onboarding-Änderungen erreichen neue Nutzer erst mit dem nächsten Store-Build.
- Update-Verhalten und Code-Signing gibt es nur im Store-Build: `ABIAPP_STORE_BUILD=1` (setzt `release.json` `env`). Ohne das Flag ist `updates.enabled` aus und kein Zertifikat gesetzt; Dev-Clients und lokale Builds brauchen keinen Schlüssel. Jeder `ota publish` läuft mit `ABIAPP_STORE_BUILD=1`, sonst stimmt der Fingerprint nicht und das Update kommt still nie an.
- `.env.local` braucht für Release-Builds zusätzlich `GOOGLE_SERVICE_INFO_PLIST` und `GOOGLE_SERVICES_JSON` (absolute Pfade, Vault `secrets/abiapp/`); `release.json` `requiredEnv` bricht sonst ab. Der Fingerprint hasht die aufgelöste Config inkl. `extra.firebaseConfigured`: OTA mit demselben `.env.local` veröffentlichen wie den Store-Build.

## Harte Regeln

- Tests nur für reine Logik ohne React-Native-Imports (Vitest, `npm test`): Domain (`src/domain/**/*.test.ts`, je Ruleset durchgerechnete Beispiele mit exakter Gleichheit von E_I, E_II, Gesamt und Note), `src/utils/**/*.test.ts` und reine Funktionen in `src/services/**/*.test.ts` (z. B. `clipping.ts`). Keine UI-, Snapshot- oder Coverage-Tests. UI wird über Type-Check, Lint und echte Simulator-/Emulator-Durchläufe verifiziert.
- Kein eigenes Konto und kein eigenes Backend. Abgleich nur über das eigene iCloud- bzw. Google-Konto des Nutzers (Cloud-Backup). Keine Bezahlfunktionen, keine KI-Funktionen.
- `ios/` und `android/` sind generiert (Continuous Native Generation). Native Änderungen nur über `app.config.ts` und `plugins/`. `prebuild --clean` verwirft alles Generierte.
- Bundle-ID/Paket nicht ändern (Store-Update der bestehenden App).
- Keine neuen nativen Dependencies ohne Rücksprache; jede braucht einen neuen Dev-Client-Build. Eigene native Module liegen unter `modules/` (Expo-Autolinking).
- SQLite-Migrationen in `src/services/database/` nur anhängen, nie geänderte oder umsortierte Migrationen ausliefern.
- Ruleset-IDs (`SN-2027`) und Katalog-Keys (`de`, `ma`, …) nie umbenennen: Sie stehen in den Nutzerdatenbanken und Backups.
- `GoogleService-Info.plist`, `google-services.json`, `.env.local` sind lokal und gitignored. Ohne die Firebase-Dateien baut die App, Analytics ist dann ein No-op.

## Architektur

- `src/domain/` ist reines TypeScript ohne React-Native-Imports. UI und Datenschicht importieren nur aus `@domain/index` und `@domain/model`. `model.ts` ist der Vertrag: nur kompatibel erweitern (neue optionale Felder). Engine, Rechenregeln, Annahmen und Anleitung für neue Rulesets: [docs/rulesets.md](docs/rulesets.md).
- Note immer ganzzahlig über `gradeFromPoints` berechnen, nie mit Gleitkomma.
- Das aktuelle Halbjahr (`currentHalfYearOf` in `src/stores/engineInput.ts`: Schulkalender, später durch eingetragene Zeugnisnoten) geht als `EngineInput.currentHalfYear` in die Engine. Jeder Aufruf von `selectEngineInput` muss es setzen, sonst rechnen Screens verschieden.
- Datenschicht: Repositories in `src/services/database/repositories/`, Stores in `src/stores/` (Fachdaten nur in SQLite, UI-Einstellungen in AsyncStorage). `useEvaluation()` baut den Engine-Input memoisiert; `targetAnalysis` ist teurer und nur memoisiert/verzögert aufrufen.
- Store-Aktionen werfen `DataValidationError` mit deutscher Meldung; die UI zeigt sie als Toast.
- Analytics nur über `src/services/analytics/appEvents.ts` (fire-and-forget). Firebase erhebt keine Geräte-Kennungen außer der App-Instanz-ID: `firebase.json` schaltet Werbe-ID, SSAID (Android), IDFV (iOS), die Werbenetzwerk-Registrierung und die Werbe-Einwilligungen ab, `app.config.ts` blockt `AD_ID`, `plugins/withFirebaseIos.js` lässt IdentitySupport weg. Änderungen daran ändern die Datenschutzangaben in beiden Stores und auf abi-app.io. Parameter enthalten nie Noten, Fachnamen, Freitexte oder andere persönliche Daten, nur Länder, Ruleset-IDs, Zähler und Enum-Werte.
- Cloud-Backup (`src/services/cloudBackup/`): Snapshot = Backup-Datei aus `backupService` plus `cloud`-Metadaten (Revision, Eltern-Revision, Inhalts-Hash, Gerätetyp). Die Entscheidung (hochladen, übernehmen, fragen, Wiederherstellung anbieten) ist allein `decideSync` in `syncLogic.ts` (rein, Vitest); neue Fälle dort mit Test. Abgleich-Metadaten nur in AsyncStorage (`cloudBackupStore`), nie in SQLite. Vor jedem Übernehmen schreibt die App eine Sicherheitskopie (`files/cloud-backup/previous.json`). Anbieter: iOS iCloud Key-Value-Store (`modules/abiapp-cloud`, Wert zlib-komprimiert, Limit 1 MB), in Dev-Builds zusätzlich ein Testordner. Android: Auto Backup mit Regeln aus `plugins/withAndroidBackupRules.js`, kein laufender Abgleich. Texte nennen Gerätetypen („von einem iPad“), nie Gerätenamen.
- Bei zustand `persist` in `onRehydrateStorage` immer `setState` verwenden, nie den State mutieren (sonst hängt der Release-Build).
- Routen: Root-Stack in `app/_layout.tsx` registriert alle Modals; das Onboarding steuert `Stack.Protected` über den Profil-Store. Tab-Roots sind eigene Stacks mit Large Title.
- Texte: `src/locales/de.ts` ist die Quelle der Wahrheit, `en.ts` wird dagegen typgeprüft. Bereichstexte liegen in `src/locales/parts/<bereich>.{de,en}.ts`. Engine-Texte (Checks, Issues, Annahmen) sind deutsch.

## Native UI und Design

- Look „Schwarz auf Weiß“: neutrale Grautöne, Akzent ist ohne Auswahl die Textfarbe (Primärbutton schwarz, dark invertiert). Einzige Signalfarbe ist Rot (Defizit, „nicht bestanden“, Fehler, destruktiv).
- Akzentfarbe: In den Einstellungen wählt man Schwarz oder eine von sechs Farben (`src/constants/accents.ts`, Keys nie umbenennen, `themeStore.accent`). Sie ersetzt `accent`/`accentForeground` in `colors`. Alles Antippbare und Ausgewählte (Buttons, Links, Auswahl, Bogen, Balken, aktiver Tab) nimmt deshalb `colors.accent`, nie `colors.text`. Neue Töne brauchen 4,5:1 auf `background`, `card` und `fill` (`check-contrast`). Farben nur über Tokens aus `src/constants/colors.ts` (Namen sind Vertrag, `success`/`warning`/`info` sind neutral); Hex-Literale in `app/**` und `src/components/**` verbietet die Lint-Regel `abiapp/no-hex-colors`. Kontraste prüft `scripts/check-contrast.mts` (Teil von `npm run lint`).
- Fachfarben: gespeichert als Palettenschlüssel (`src/components/ui/subjectPalette.ts`, Keys nie umbenennen) oder `null` = neutral. Ein neues Fach bekommt beim Anlegen eine Standardfarbe (`src/utils/subjectColor.ts`: übliche Farbe des Fachs, sonst nach Merkmal, vergebene Farben werden übersprungen); im Fach-Editor lässt sie sich ändern oder entfernen. Sichtbar nur in `SubjectAvatar` und im Kopf der Fach-Detailseite.
- Erklärtexte stehen hinter einem Info-Icon und erscheinen erst beim Antippen: `Section info`, sonst `InfoNote` bzw. `InfoButton` + `InfoText` (`src/components/ui/InfoNote.tsx`). Immer sichtbar bleiben nur Werte, Status und Gründe für gesperrte Bedienelemente (`Section footer`, `InfoNote label`).
- Punkteskala: Form statt Farbe. Amtlich gefüllt (grau), Prognose aus Noten als Umriss, Schätzung gestrichelt, 0–4 rot (`POINTS_SCALE` in `src/components/ui/points.ts`). Umriss ist für Prognosen reserviert (auch Chip `tone="accent"`, gestrichelter Bogen im `GradeHero`).
- Icons in Inhalten: `<Icon icon={LucideIcon} size={16|20|24} color=… />` (Lucide, Strich 1,75 bzw. 2 bei 16). `expo-symbols` ist per Lint gesperrt; SF Symbols leben nur als Namen im nativen Chrome (Menü-`image`, `Stack.Toolbar`). Keine Icons in farbigen Kreisen, Icons nur wo sie beim Scannen helfen.
- Tab-Bar: Lucide-Template-PNGs aus `scripts/generate-tab-icons.mjs` (macOS, AppKit rendert das SVG).
- Jeder Screen hat einen nativen Header. Modals nutzen `src/components/common/ModalHeader.tsx` (`Stack.Toolbar`, „Abbrechen“ links, „Sichern“ bzw. „Fertig“ rechts).
- Menüs nur über `src/components/common/NativeMenu.tsx` bzw. `ContextMenuRow`/`ListRow menu`. `image` ist Pflicht und vom Typ `MenuSymbol` (`src/constants/menuIcons.ts`): ein Symbol ohne Android-Icon kompiliert nicht. Der Adapter setzt `imageColor`, sonst sind Icons unter Fabric unsichtbar. SF-Symbole müssen auf iOS 16.4 existieren.
- Android-Menü- und Toolbar-Icons sind Lucide-VectorDrawables (`assets/android-menu-icons/`, `assets/icons/toolbar/`), erzeugt von `node scripts/generate-android-menu-icons.mjs`, beim Prebuild per `plugins/withAndroidMenuIcons.js` nach `res/drawable`. Neues Symbol: in `MENU_ICONS` eintragen, Skript, Prebuild, nativer Android-Build. Katalog-Symbole aus `src/domain` prüft `scripts/check-menu-icons.mts` (Teil von `npm run lint`).
- UI-Bausteine aus `src/components/ui/` verwenden (PointsBadge, GradeHero, ListRow, SegmentedControl, PointsPicker, CheckRow, …), Typografie und Radien aus `src/constants/typography.ts` (Karten 16, Controls 12, Badges 8, `borderCurve: "continuous"`). Die Dev-Galerie (`abiapp://dev-gallery`) zeigt alle Bausteine.
- Prognosen sind immer als Prognose erkennbar (`CourseValue.source`), offene Bedingungen (`passed = null`) als „offen“, nie als nicht erfüllt. Halbjahre vor dem aktuellen sind abgeschlossen: Ohne Zeugnisnote zählt dort der Notenschnitt als Ergebnis (`source: "official"`, `fromGrades`, Chip „aus Noten“), eine eingetragene Zeugnisnote geht vor.

## Bekannte Workarounds

- `expo-build-properties` `ios.usePrecompiledModules: false`: Die vorkompilierten Expo-Module von SDK 58 passten nicht zu `expo-modules-core` (dyld „Symbol missing“ beim Start). Entfernen, sobald Expo passende Artefakte liefert, und dann per Simulator-Start prüfen.
- `plugins/withFirebaseIos.js`: setzt `use_modular_headers!` und ruft `FirebaseApp.configure()` im AppDelegate auf (das RNFB-Plugin findet den Einfügepunkt unter SDK 58 nicht mehr). `@react-native-firebase/app` läuft mit `ios.disableSPM: true`.
- `patches/`: `@react-native-menu/menu` (Imports für RN 0.88; Android: `mutate()` am Menü-Icon, damit geteilte Drawables ihre eigene Tönung behalten) und `@vibelabsdotto/featurama-rn-expo` (Kotlin `getCurrentActivity()`). `@vibelabsdotto/vibeupdate` per `overrides` an SDK 58 angepasst. Patches entfernen, sobald die Pakete upstream passen.
- Xcode 27 Simulator: Taps nur mit `axe tap … --tap-style physical` zuverlässig.

## Environment

`.env.local` (Vorlage `.env.example`): `EXPO_PUBLIC_VIBEUPDATE_APP_ID` (VibeUpdate-App „AbiApp“), `EXPO_PUBLIC_FEATURAMA_API_KEY` (Featurama-Projekt „AbiApp“). Beide Werte landen öffentlich im Bundle; ohne Wert entfallen Update-Hinweis bzw. Feature-Wünsche. Firebase-Projekt: `abisax-506cd`.
