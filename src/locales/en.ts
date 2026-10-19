import type { Translations } from "./de";
import { overviewEN } from "./parts/overview.en";
import { setupEN } from "./parts/setup.en";
import { subjectsEN } from "./parts/subjects.en";

export const en: Translations = {
  ...setupEN,
  ...subjectsEN,
  ...overviewEN,
  common: {
    comingSoon: "Coming soon",
    retry: "Try again",
    close: "Close",
  },
  tabs: {
    home: "Overview",
    subjects: "Subjects",
    abitur: "Abitur",
    settings: "Settings",
  },
  errors: {
    title: "Something went wrong",
    message: "The app ran into an unexpected error.",
    initFailed: "The database could not be opened.",
  },
  notFound: {
    title: "Page not found",
    back: "Go to overview",
  },
  ui: {
    points: "Points",
    pointsValue: "{{points}} points",
    pointsWithGrade: "{{points}} points, grade {{grade}}",
    noValue: "No value yet",
    source: {
      official: "official",
      grades: "Prognosis",
      estimate: "Estimate",
      none: "No value yet",
    },
    hero: {
      prognosis: "Prognosis",
      result: "Result",
      notPassed: "Not passed",
      noGrade: "No grade yet",
      totalOf: "{{points}} of {{max}} points",
      passMarker: "Pass from {{points}}",
      topMarker: "1.0 from {{points}}",
      goal: "Goal {{grade}}",
      goalMarker: "Your goal",
      gradeLabel: "Abitur average {{grade}}",
    },
    check: {
      passed: "Met",
      open: "Open",
      failed: "Not met",
      predicted: "Prognosis",
    },
    issue: {
      error: "Error",
      warning: "Note",
      info: "Info",
    },
    halfYear: "Half-year {{name}}",
    progress: "{{value}} of {{max}}",
    gallery: {
      title: "Design gallery",
    },
  },
};
