# Regel-Engine und Rulesets

Die Engine in `src/domain/` berechnet Block I, Block II, Gesamtpunkte, Note sowie Zulassung und Bestehen für alle 16 Bundesländer. Sie ist reines TypeScript ohne React-Native-Imports und läuft auch in Node.

## Aufbau

```text
src/domain/index.ts             öffentliche API (evaluate, validateSetup, targetAnalysis, …)
src/domain/model.ts             Vertrag zwischen Engine, Datenschicht und UI
src/domain/engine/math.ts       Ganzzahl-Helfer: floorDiv, roundHalfUpFrac, Notenformel
src/domain/engine/prognosis.ts  Halbjahresprognose aus Noten, requiredNextGrade
src/domain/engine/context.ts    Kurswerte (amtlich > Noten > Schätzung > keiner)
src/domain/engine/blockI.ts     exakter Optimierer der Einbringung
src/domain/engine/blockII.ts    Prüfungskomponenten, schriftlich + mündlich, Prognosen
src/domain/engine/validate.ts   Setup-Validierung (eA-Anzahl, Katalog, Prüfungsslots)
src/domain/engine/evaluate.ts   evaluate, validateSetup, targetAnalysis
src/domain/rulesets/types.ts    interner Ruleset-Typ (RulesetSummary + Logik)
src/domain/rulesets/helpers.ts  Bausteine für Pflichten, Checks und Komponenten
src/domain/rulesets/catalog.ts  Basis-Fächerkatalog (stabile Keys, Tags, Feld, SF-Symbol)
src/domain/rulesets/<LAND>.ts   ein Modul je Land, eine Konstante je Regelversion
src/domain/rulesets/registry.ts Registry und defaultRulesetFor(state, year)
```

## Rechenregeln

- Halbjahresprognose: gewichteter Schnitt je Notenart, dann Klausuranteil, **einmal** kaufmännisch auf ganze Punkte gerundet.
- Kurswert: amtliches Halbjahresergebnis schlägt Prognose; ohne Noten wird geschätzt (Schnitt der anderen Halbjahre des Fachs, sonst Gesamtschnitt) und als Schätzung markiert.
- Block I: `E_I = roundHalfUp(P · 40 / S)` als Ganzzahlbruch. Bei S = 40 ist E_I = P.
- Note nur ganzzahlig: `tenths = max(floor((1020 − E) / 18), 10)`, E < 300 → keine Note. Nie die Gleitkommaformel `17/3 − E/180` verwenden.
- Schriftlich + zusätzliche mündliche Prüfung mit der Landesformel und Landesrundung (z. B. erst nach der Multiplikation runden, in HE/TH abrunden).
- Fehlende Eingaben (noch nicht belegtes Pflichtfach, fehlendes Extra, offene Prüfung) gelten als offen (`RuleCheck.passed = null`), nicht als Verletzung.
- Unvollständige Fächerwahl (weniger Block-I-Plätze angelegt als gefordert): Die fehlenden Plätze füllt ein Platzhalter (`IncludedCourse.placeholder`, `source: "estimate"`, `slots` = Anzahl, Punkte = gerundeter Schnitt der vorhandenen Kurse, nie Defizit). `BlockIResult.missingCourses` nennt die Lücke, Anzahl- und Pflicht-Check sind offen, `blockI.admitted` und `total.passed` sind `null`. Echte Verletzungen bei vollständiger Wahl (Defizite, eigener Ausschluss gegen eine Pflicht, 0 Punkte) bleiben `false`.

## Optimierer Block I

1. Konfigurationen: Gewichtungsvariante × je Pflicht eine Option × Extra-Variante × Relaxation. Dominierte Optionen werden exakt verworfen.
2. Pflichtmenge: manuelle „Immer einbringen“, Extras, Implikationskurse, je Fach die besten k Kurse.
3. Auffüllen über Listen gleicher Gewichte und Filterzugehörigkeit; ein kleines DP liefert das beste P je Zustand (Anzahl, S, Defizite, Gruppenfortschritt). Branch and Bound über die Konfigurationen.
4. Bewertung je zulässiger Kursanzahl: zulässig vor unzulässig, dann E_I, dann weniger Defizite, dann höheres P/S, dann weniger Kurse.
5. Manuelle Overrides werden respektiert. Widerspricht einer einer Pflicht, kommt `block1.manual.conflict`. Wahlen, die die Verordnung offen lässt, erscheinen in `blockI.assumptions`.

## Annahmen, wo die Verordnung offen ist

- **NW:** Das „neunte Pflichtfach“ wählt die Engine günstigst (Annahme); festlegbar per „Immer einbringen“. Zusatzkurse Geschichte/Sozialwissenschaften sind zwei aufeinanderfolgende Kurse (auch Q1 bei Fortführung, § 11 Abs. 3 Nr. 5). NW-2030: Ist das 5. Abiturfach in Q2 nicht belegt, gilt es als Referenzfach des Projektkurses (nur 2 Kurse Q1, § 26 Abs. 2); ist es durchgehend belegt, rechnet die App mit 4 Kursen. Nicht modelliert: § 28 Abs. 4/5 (2027: § 26 Abs. 4/5) für neu einsetzende zweite Fremdsprachen, Vertiefungskurse, instrumental-/vokalpraktische Kurse.
- **SN:** Informatik ersetzt eine Naturwissenschaft nur, wenn ohne sie eine fehlt (§ 42 Abs. 1 S. 4, § 43 Abs. 3): bei einer NW oder bei zwei NW ohne zweite Fremdsprache, ohne in Klasse 10 begonnene Fremdsprache und ohne Fremdsprachen-LK. Befreiungen nach § 42 Abs. 4/5 erkennt die App nicht.
- **BY:** Seminararbeit unter 9 Punkten zählt als zwei Defizite; fehlt sie, wird sie aus dem W-Seminar geschätzt. Vertiefungskurs Deutsch/Mathematik gilt als Wahlpflichtfach, sobald die Option günstiger ist (bei in 13 freiwillig fortgeführtem Fach als Annahme angezeigt). Ein 0-Punkte-Kurs in einem eigenen Fach (Zusatzangebot) blockiert die Zulassung nicht.
- **BW:** Seminarkurs unter 5 Punkten in Block I zählt als zwei Defizite; wählbar Block I oder statt P5. Informatik ersetzt die zweite Naturwissenschaft nur im Schulversuch (Leitfaden, nicht in der AGVO). Welche Geographie-/Gemeinschaftskunde-Kurse belegpflichtig sind, legt die Schule fest; die 0-Punkte-Prüfung zählt nur, ob genug Kurse ohne 0 Punkte da sind.
- **ST:** Doppelt gewichtetes Defizit zählt zweimal. Das 2:1-Gesamtergebnis der besonderen Lernleistung rundet die App kaufmännisch (§ 33 Abs. 5: sonst entscheidet der Fachprüfungsausschuss). Für die 0-Punkte-Belegpflicht zählt das fünfte Wahlpflichtfach nicht mit; Profil- und Wahlpflicht-Fremdsprache unterscheidet die App nicht.
- **BB:** 2:1-Bewertung mit Zusatzprüfung kaufmännisch nach der Multiplikation, Besondere Lernleistung (Arbeit + Kolloquium) × 2 ohne Zwischenrundung (beides amtlich nicht geregelt; § 11 Abs. 4 und Formblatt 10 lassen auch eine Gesamtbewertung in ganzen Punkten zu). Für die 0-Punkte-Belegpflicht zählt das weitere Fach aus Aufgabenfeld II/III nicht mit.
- **TH:** Seminarfachleistung aus drei Teilleistungen (20/30/50 %); Fächer über den regulären 10 sind Wahlfächer, die Engine wählt sie günstigst (Annahme), aber nie Deutsch, Mathematik, Englisch, Geschichte, Sport oder das einzige Fach aus Naturwissenschaft, Kunst/Musik/DG bzw. Religion/Ethik (§ 76 Abs. 1). Klausuranteil der Prognose 33 % für das amtliche Drittel (§ 74 Abs. 11); exakt auf ,5 kann die Prognose daher um einen Punkt abweichen.
- **BE:** Präsentationsprüfung wird als Gesamtnote eingegeben; die Gesamtbewertung der Besonderen Lernleistung rundet die App kaufmännisch. Eine später begonnene Fremdsprache gilt als in der Einführungsphase begonnene zweite Fremdsprache (§ 10 Abs. 3, § 25 Abs. 2). Drei Leistungskurse (§ 24) und ein BLL-Referenzfach, das schon Prüfungsfach ist, sind nicht abbildbar.
- **HE:** Die Pflicht aus § 14 Abs. 3 OAVO (zweite, in der Oberstufe neu begonnene Fremdsprache: Q3 und Q4 immer einbringen) ist nicht eigens modelliert; die App kann nicht unterscheiden, ob die neu begonnene Sprache Pflicht (§ 14 Abs. 3) oder freiwillig (§ 14 Abs. 2, 4) ist. Geographie zählt für die 2 GW-Kurse ohne Prüfung der durchgängigen Belegung seit E1. Mit Besonderer Lernleistung gilt ein fehlendes Aufgabenfeld unter den vier Prüfungsfächern nur als Hinweis (§ 24 Abs. 3 Satz 4).
- **HE/SL/HH/HB/NI ab 2030:** Entwürfe bzw. KMK-Rahmen, als `draft` markiert.
- **SL-2027:** Eine Fremdsprache als L-Kurs ist die Pflichtfremdsprache (nur sie zählt als Kernfach); bei zwei G-Kurs-Fremdsprachen bzw. zwei GW- oder NW-Fächern wählt die Engine das günstigere Pflichtfach. SL-2030: 36 Kurse, zwei eA-Prüfungsfächer doppelt, höchstens 20 % unter 5 Punkten (KMK Ziff. 9.5.3–9.5.7), LK-Kombination nur als Warnung.
- **RP:** Prüfungshalbjahr-Regel gilt für alle Grundfächer mit einem Kurs in 13. Zusätzliche mündliche Prüfung kaufmännisch gerundet nach mss.rlp.de; die AbiPrO-Fassung 2010 (§ 12, Anlagen 1, 2) schnitt ab, der aktuelle Wortlaut war nicht abrufbar. Facharbeit unter 5 Punkten zählt als ein Defizit.
- **NI, RP, HH, SH:** Eine neu begonnene Fremdsprache gilt als Pflichtsprache (Zusatzeinbringung, 0-Punkte-Sperre), wenn höchstens eine fortgeführte Fremdsprache belegt ist; bei zwei fortgeführten gilt sie als freiwillig.
- **HH ab 2030:** Künstlerisches Fach nur 2 Ergebnisse (Entwurf laut Stellungnahmen, KMK Ziff. 7.1), übrige Pflichten wie 2027 angenommen.
- **SH:** Kern-Fremdsprache ist die in P1/P2 geprüfte, sonst eine fortgeführte Sprache.
- **MV:** MV-2027 folgt der APVO i. d. F. vom 30.04.2024 (Übergang Art. 2 Abs. 3 der VO vom 01.08.2025). Deren Volltext war bei der Prüfung im November 2026 nicht abrufbar; Berechnung (§ 43, Anlagen 4, 5, 7) wie in der geltenden Fassung angenommen, Geschichte und Politische Bildung mit 4 Pflicht-Halbjahren, Sozialkunde ohne Pflicht, BLL je zur Hälfte. Eine neu einsetzende Fremdsprache gilt immer als Pflicht nach § 6 (Q3 und Q4 einbringen).
- **HB:** Formel statt der fehlerhaften amtlichen Tabelle (vierfache Tabelle mit BLL, mündlich 2 / schriftlich 15: gedruckt 53, Formel 43). Die BLL zählt bei „zwei Prüfungsfächer mit 25 bzw. 20 Punkten“ nicht mit (Annahme, § 18 Abs. 3 nennt nur Prüfungsfächer). HB-2030 nach dem Verordnungsentwurf (VL 21/8645, Stand 05.10.2026): alle 8 LK doppelt, Projektkurs Q1 einfach (S = 42), 6 Kurse Aufgabenfeld II, Defizitgrenze inkl. Projektkurs; die Broschüre „Wege zum Abitur 2027/28“ nennt abweichend LK in Q2.2 einfach.

## Bekannte Grenzen

- Nicht modelliert: vertiefte Ausbildung, Sorbisches Gymnasium, Abendgymnasium/Kolleg, berufliche Gymnasien, bilinguale Sonderregeln, Abibac, Sportarten-Regeln, Sonderfälle neu einsetzender Fremdsprachen.
- Teilprüfungen (Fremdsprache 3:1 in BW, praktische Teile, BE-Präsentation mit drei Teilen) werden als Gesamtpunktzahl eingegeben.
- `targetAnalysis` ruft `evaluate` mehrfach auf; in der UI memoisieren.
- Für Abitur 2030 stehen in mehreren Ländern noch Landesänderungen aus (KMK-Umsetzung). Vor Releases für diesen Jahrgang neu prüfen.

## Ruleset anlegen oder ändern

1. **Version:** In `src/domain/rulesets/<LAND>.ts` eine Konstante je Version, möglichst über eine Factory wie in `BW.ts`/`NW.ts`. `id` und `abiturYears` exakt nach Verordnung; die alte Version bekommt ein `to`. Ruleset-IDs und Katalog-Keys nie umbenennen, sie stehen in der Datenbank der Nutzer. Neue Version in `registry.ts` eintragen.
2. **Daten:** Halbjahre, Niveau-Namen, `elevatedSubjects`, Katalog über `catalog([...])`, `summary` (5–10 kurze deutsche Punkte), `sources` (Titel, Paragraph, URL), `confidence`, `draft` bei Entwürfen. Neue SF-Symbole gegen `/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/name_availability.plist` prüfen (Deployment-Target iOS 16.4).
3. **Block I:** `count`, `weightings`, `requirements` (mit `short` bzw. `Pick.label` für `IncludedCourse.mandatoryLabel`), Helfer `examSubjectRequirements`, `oneOf`, `each`, `combinations`, `consecutiveWindows`; `groupMins` für Summenregeln, `implications`, `extras`, `relaxations`, `deficitLimits`, `zero`, `checks`. Eine Requirement = genau eine Option muss gelten.
4. **Block II:** Varianten mit `component(...)`, Faktor je Variante, `rounding`, `combine`/`partsCombine`, `assumptions`, Checks `checkBlockIIMin`, `checkMinComponents`, `checkNoneBelow`, `checkNoZeroExam`.
5. **Validierung:** `validate(ctx)` für eA-Kombinationen und Prüfungsfachwahl; `error` nur, wenn die Wahl vollständig und eindeutig falsch ist.
6. **Prüfen:** Ein amtliches oder vollständig durchgerechnetes Beispiel als Test in `src/domain/rulesets/__tests__/<LAND>.test.ts` nachbauen und exakte Gleichheit von E_I, E_II, Gesamt und Note verlangen. Quelle des Beispiels (Verordnung, Paragraph, URL) im Test nennen. Danach `npm test`, `npm run type-check`, `npm run lint`.

7. Engine nur erweitern, wenn Daten und Hooks nicht reichen. Neue Felder in `model.ts` optional halten.
