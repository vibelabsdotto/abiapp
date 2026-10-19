import type { Translations } from "./de";

export const en: Translations = {
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
  home: {
    title: "Overview",
    placeholder:
      "Your grade average and Abitur qualification status will appear here soon.",
  },
  subjects: {
    title: "Subjects",
    placeholder:
      "Soon you will manage your subjects, courses and grades for every semester here.",
  },
  abitur: {
    title: "Abitur",
    placeholder:
      "Soon you will calculate your Abitur grade here using your state's rules.",
  },
  settings: {
    title: "Settings",
    appearance: "Appearance",
    theme: "Theme",
    chooseTheme: "Choose theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "Language",
    chooseLanguage: "Choose language",
    languageSystem: "System",
    languageGerman: "Deutsch",
    languageEnglish: "English",
    feedback: "Feedback",
    featureRequests: "Feature requests",
    featureRequestsUnavailable:
      "Feature requests are not available in this version.",
    about: "About",
    version: "Version",
    privacy: "All data stays on your device. No account, no cloud.",
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
};
