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
    message: "Die App ist auf einen unerwarteten Fehler gestoßen.",
    initFailed: "Die Datenbank konnte nicht geöffnet werden.",
  },
  notFound: {
    title: "Seite nicht gefunden",
    back: "Zur Übersicht",
  },
  ui: {
    points: "Punkte",
    pointsValue: "{{points}} Punkte",
    pointsWithGrade: "{{points}} Punkte, Note {{grade}}",
    noValue: "Noch kein Wert",
    source: {
      official: "amtlich",
      grades: "Prognose",
      estimate: "Schätzung",
      none: "Noch kein Wert",
    },
    hero: {
      prognosis: "Prognose",
      result: "Ergebnis",
      notPassed: "Nicht bestanden",
      noGrade: "Noch keine Note",
      totalOf: "{{points}} von {{max}} Punkten",
      passMarker: "Bestanden ab {{points}}",
      topMarker: "1,0 ab {{points}}",
      goal: "Ziel {{grade}}",
      goalMissing: "noch {{points}} Punkte",
      goalReached: "Ziel erreicht",
      gradeLabel: "Abiturschnitt {{grade}}",
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
