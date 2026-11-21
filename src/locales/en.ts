import type { Translations } from "./de";
import { backupEN } from "./parts/backup.en";
import { engagementEN } from "./parts/engagement.en";
import { onboardingEN } from "./parts/onboarding.en";
import { overviewEN } from "./parts/overview.en";
import { setupEN } from "./parts/setup.en";
import { subjectsEN } from "./parts/subjects.en";

export const en: Translations = {
  ...setupEN,
  ...backupEN,
  ...onboardingEN,
  ...subjectsEN,
  ...overviewEN,
  ...engagementEN,
  common: {
    cancel: "Cancel",
    save: "Save",
    done: "Done",
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
    message:
      "AbiApp ran into an unexpected error. Your data is safe. Please try again.",
    initFailed: "AbiApp could not open your data. Please try again.",
  },
  notFound: {
    title: "Page not found",
    back: "Open overview",
  },
  ui: {
    points: "Points",
    pointsValue: "{{points}} points",
    pointsWithGrade: "{{points}} points, grade {{grade}}",
    pointValue: "{{points}} point",
    pointWithGrade: "{{points}} point, grade {{grade}}",
    noValue: "No value yet",
    source: {
      official: "official",
      settled: "from grades",
      grades: "Prognosis",
      estimate: "Estimate",
      none: "No value yet",
    },
    hero: {
      prognosis: "Prognosis",
      result: "Result",
      notPassed: "Not passed",
      noGrade: "No average yet",
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
    info: {
      show: "Show explanation",
      hide: "Hide explanation",
    },
    halfYear: "Half-year {{name}}",
    progress: "{{value}} of {{max}}",
    gallery: {
      title: "Design gallery",
    },
  },
};
