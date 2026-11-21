// German strings. This file is the source of truth for keys and structure;
// en.ts must satisfy the same shape.

import { overviewDE } from "./parts/overview.de";
import { setupDE } from "./parts/setup.de";
import { subjectsDE } from "./parts/subjects.de";

export const de = {
  ...setupDE,
  ...subjectsDE,
  ...overviewDE,
  common: {
    cancel: "Abbrechen",
    save: "Sichern",
    done: "Fertig",
    comingSoon: "Kommt bald",
    retry: "Erneut versuchen",
    close: "Schließen",
  },
  tabs: {
    home: "Übersicht",
    subjects: "Fächer",
    abitur: "Abitur",
    settings: "Einstellungen",
  },
  errors: {
    title: "Etwas ist schiefgelaufen",
    message:
      "AbiApp ist auf einen unerwarteten Fehler gestoßen. Deine Daten sind sicher. Versuche es noch einmal.",
    initFailed:
      "AbiApp konnte deine Daten nicht öffnen. Versuche es noch einmal.",
  },
  notFound: {
    title: "Seite nicht gefunden",
    back: "Übersicht öffnen",
  },
  ui: {
    points: "Punkte",
    pointsValue: "{{points}} Punkte",
    pointsWithGrade: "{{points}} Punkte, Note {{grade}}",
    pointValue: "{{points}} Punkt",
    pointWithGrade: "{{points}} Punkt, Note {{grade}}",
    noValue: "Noch kein Wert",
    source: {
      official: "amtlich",
      settled: "aus Noten",
      grades: "Prognose",
      estimate: "Schätzung",
      none: "Noch kein Wert",
    },
    hero: {
      prognosis: "Prognose",
      result: "Ergebnis",
      notPassed: "Nicht bestanden",
      noGrade: "Noch kein Schnitt",
      totalOf: "{{points}} von {{max}} Punkten",
      passMarker: "Bestanden ab {{points}}",
      topMarker: "1,0 ab {{points}}",
      goal: "Ziel {{grade}}",
      goalMarker: "Dein Ziel",
      gradeLabel: "Abischnitt {{grade}}",
    },
    check: {
      passed: "Erfüllt",
      open: "Offen",
      failed: "Nicht erfüllt",
      predicted: "Prognose",
    },
    issue: {
      error: "Fehler",
      warning: "Hinweis",
      info: "Info",
    },
    info: {
      show: "Erklärung anzeigen",
      hide: "Erklärung ausblenden",
    },
    halfYear: "Halbjahr {{name}}",
    progress: "{{value}} von {{max}}",
    gallery: {
      title: "Design-Galerie",
    },
  },
};

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};

export type Translations = DeepStringRecord<typeof de>;
