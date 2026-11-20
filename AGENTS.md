# AGENTS.md

Arbeitsregeln für Agents in diesem Repo. Führende Quelle für Projektkontext; bei Änderungen an Architektur, Befehlen oder Regeln hier pflegen.

## Projekt

AbiApp ist ein kostenloser Abiturrechner für alle 16 Bundesländer (Expo SDK 58, React Native, Expo Router mit NativeTabs, Zustand, expo-sqlite). Alles läuft lokal auf dem Gerät: kein Konto, kein Backend, keine KI. Die App ersetzt AbiSax und läuft unter derselben Store-Identität `com.max.mannstein.abisax` (iOS und Android). Open Source unter MIT.

## Befehle

```bash
npm install                 # führt patch-package aus
npx expo prebuild --clean   # erzeugt ios/ und android/ (nicht eingecheckt)
npm run ios                 # Dev-Client bauen + starten, Metro auf Port 8090
npm run android
npm start                   # nur Metro (Dev-Client), Port 8090
npm run type-check
npm test                    # Vitest, nur src/domain
npm run lint
npm run format:check
```

Metro läuft immer auf **8090** (8081–8083 gehören anderen Projekten). Laufzeit-Eval in der laufenden Dev-App: `node scripts/app-eval.mjs <ausdruck.js> '<Simulatorname>'`; Dev-Helfer unter `globalThis.__abiapp` (`seedDemoData({ state, abiturYear })`, `backup`, `setup`, `stores`).

## Harte Regeln

- Tests nur für die reine Domain-Schicht (`src/domain/**/*.test.ts`, Vitest, `npm test`): je Ruleset durchgerechnete Beispiele mit exakter Gleichheit von E_I, E_II, Gesamt und Note. Keine UI-, Snapshot- oder Coverage-Tests. UI wird über Type-Check, Lint und echte Simulator-/Emulator-Durchläufe verifiziert.
- Kein Login, keine Cloud-Synchronisation, keine Bezahlfunktionen, keine KI-Funktionen.
- `ios/` und `android/` sind generiert (Continuous Native Generation). Native Änderungen nur über `app.config.ts` und `plugins/`. `prebuild --clean` verwirft alles Generierte.
- Bundle-ID/Paket nicht ändern (Store-Update der bestehenden App).
- Keine neuen nativen Dependencies ohne Rücksprache; jede braucht einen neuen Dev-Client-Build.
- SQLite-Migrationen in `src/services/database/` nur anhängen, nie geänderte oder umsortierte Migrationen ausliefern.
- Ruleset-IDs (`SN-2027`) und Katalog-Keys (`de`, `ma`, …) nie umbenennen: Sie stehen in den Nutzerdatenbanken und Backups.
- `GoogleService-Info.plist`, `google-services.json`, `.env.local` sind lokal und gitignored. Ohne die Firebase-Dateien baut die App, Analytics ist dann ein No-op.

## Architektur

- `src/domain/` ist reines TypeScript ohne React-Native-Imports. UI und Datenschicht importieren nur aus `@domain/index` und `@domain/model`. `model.ts` ist der Vertrag: nur kompatibel erweitern (neue optionale Felder). Engine, Rechenregeln, Annahmen und Anleitung für neue Rulesets: [docs/rulesets.md](docs/rulesets.md).
- Note immer ganzzahlig über `gradeFromPoints` berechnen, nie mit Gleitkomma.
- Datenschicht: Repositories in `src/services/database/repositories/`, Stores in `src/stores/` (Fachdaten nur in SQLite, UI-Einstellungen in AsyncStorage). `useEvaluation()` baut den Engine-Input memoisiert; `targetAnalysis` ist teurer und nur memoisiert/verzögert aufrufen.
- Store-Aktionen werfen `DataValidationError` mit deutscher Meldung; die UI zeigt sie als Toast.
- Analytics nur über `src/services/analytics/appEvents.ts` (fire-and-forget). Parameter enthalten nie Noten, Fachnamen, Freitexte oder andere persönliche Daten, nur Länder, Ruleset-IDs, Zähler und Enum-Werte.
- Bei zustand `persist` in `onRehydrateStorage` immer `setState` verwenden, nie den State mutieren (sonst hängt der Release-Build).
- Routen: Root-Stack in `app/_layout.tsx` registriert alle Modals; das Onboarding steuert `Stack.Protected` über den Profil-Store. Tab-Roots sind eigene Stacks mit Large Title.
- Texte: `src/locales/de.ts` ist die Quelle der Wahrheit, `en.ts` wird dagegen typgeprüft. Bereichstexte liegen in `src/locales/parts/<bereich>.{de,en}.ts`. Engine-Texte (Checks, Issues, Annahmen) sind deutsch.

## Native UI

- Jeder Screen hat einen nativen Header. Modals nutzen `src/components/common/ModalHeader.tsx` (`Stack.Toolbar`, „Abbrechen“ links, „Sichern“ bzw. „Fertig“ rechts).
- Menüs nur über `src/components/common/NativeMenu.tsx` bzw. `ContextMenuRow`/`ListRow menu`. **Jede Menüaktion hat ein Icon** (`image`, SF Symbol auf iOS). Der Adapter setzt `imageColor`, sonst sind Icons unter Fabric unsichtbar. SF-Symbole müssen auf iOS 16.4 existieren.
- Android-Menüicons: Der Adapter übersetzt das SF Symbol über `src/constants/menuIcons.ts` in ein Material-Drawable (`assets/android-menu-icons/`, beim Prebuild per `plugins/withAndroidMenuIcons.js` nach `res/drawable`). Neues Symbol in einem Menü: dort eintragen, `node scripts/generate-android-menu-icons.mjs`, Prebuild und nativer Android-Build. Fehlt der Eintrag, bleibt die Zeile auf Android ohne Icon.
- UI-Bausteine aus `src/components/ui/` verwenden (PointsBadge, GradeHero, ListRow, SegmentedControl, PointsPicker, CheckRow, …), Farben nur über Tokens aus `src/constants/colors.ts`, Typografie aus `src/constants/typography.ts`.
- Prognosen sind immer als Prognose erkennbar (`CourseValue.source`), offene Bedingungen (`passed = null`) als „offen“, nie als nicht erfüllt.

## Bekannte Workarounds

- `expo-build-properties` `ios.usePrecompiledModules: false`: Die vorkompilierten Expo-Module von SDK 58 passten nicht zu `expo-modules-core` (dyld „Symbol missing“ beim Start). Entfernen, sobald Expo passende Artefakte liefert, und dann per Simulator-Start prüfen.
- `plugins/withFirebaseIos.js`: setzt `use_modular_headers!` und ruft `FirebaseApp.configure()` im AppDelegate auf (das RNFB-Plugin findet den Einfügepunkt unter SDK 58 nicht mehr). `@react-native-firebase/app` läuft mit `ios.disableSPM: true`.
- `patches/`: `@react-native-menu/menu` (Imports für RN 0.88; Android: `mutate()` am Menü-Icon, damit geteilte Drawables ihre eigene Tönung behalten) und `@vibelabsdotto/featurama-rn-expo` (Kotlin `getCurrentActivity()`). `@vibelabsdotto/vibeupdate` per `overrides` an SDK 58 angepasst. Patches entfernen, sobald die Pakete upstream passen.
- Xcode 27 Simulator: Taps nur mit `axe tap … --tap-style physical` zuverlässig.

## Environment

`.env.local` (Vorlage `.env.example`): `EXPO_PUBLIC_VIBEUPDATE_APP_ID` (VibeUpdate-App „AbiApp“), `EXPO_PUBLIC_FEATURAMA_API_KEY` (Featurama-Projekt „AbiApp“). Beide Werte landen öffentlich im Bundle; ohne Wert entfallen Update-Hinweis bzw. Feature-Wünsche. Firebase-Projekt: `abisax-506cd`.
