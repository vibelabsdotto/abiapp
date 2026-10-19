// German strings. This file is the source of truth for keys and structure;
// en.ts must satisfy the same shape.

export const de = {
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
  home: {
    title: "Übersicht",
    placeholder:
      "Hier erscheinen bald dein Notenschnitt und der Stand deiner Abiturqualifikation.",
  },
  subjects: {
    title: "Fächer",
    placeholder:
      "Hier verwaltest du bald deine Fächer, Kurse und Noten für jedes Halbjahr.",
  },
  abitur: {
    title: "Abitur",
    placeholder:
      "Hier berechnest du bald deine Abiturnote nach den Regeln deines Bundeslands.",
  },
  settings: {
    title: "Einstellungen",
    appearance: "Darstellung",
    theme: "Design",
    chooseTheme: "Design wählen",
    themeSystem: "System",
    themeLight: "Hell",
    themeDark: "Dunkel",
    language: "Sprache",
    chooseLanguage: "Sprache wählen",
    languageSystem: "System",
    languageGerman: "Deutsch",
    languageEnglish: "English",
    feedback: "Feedback",
    featureRequests: "Feature-Wünsche",
    featureRequestsUnavailable:
      "Feature-Wünsche sind in dieser Version nicht verfügbar.",
    about: "Über",
    version: "Version",
    privacy: "Alle Daten bleiben auf deinem Gerät. Kein Konto, keine Cloud.",
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
