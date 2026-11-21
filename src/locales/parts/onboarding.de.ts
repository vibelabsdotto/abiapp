// German strings of the first-run flow: motion intro, story (question and
// mirror pages), setup steps, colour and result. Source of truth; en
// mirrors the shape.
//
// Every statement must hold in all 16 states. Before the state is chosen
// the texts stay general; after it they use the ruleset's own terms.

export const onboardingDE = {
  onboarding: {
    next: "Weiter",
    later: "Später festlegen",
    skip: "Überspringen",
    finish: "Übersicht öffnen",
    step: "Schritt {{step}} von {{total}}",
    fixIssue: "Weiter geht es, sobald der Hinweis in der Liste erledigt ist.",
    welcome: {
      claim: "Erreiche die Abinote,\ndie du willst.",
      beats: {
        standing: "Sieh, wo du stehst.",
        counts: "Sieh, was zählt.",
        needs: "Sieh, was du noch brauchst.",
        states: "Nach den Regeln deines Bundeslandes.",
      },
      promise: "Kostenlos · Ohne Konto · Deine Noten gehören dir",
      a11y: "Vorschau der App: dein Schnitt als Bogen, die Kurse, die zählen, was du für dein Ziel brauchst, und die Regeln aller 16 Bundesländer.",
      start: "Los geht's",
      restore: "Backup wiederherstellen",
    },
    // Fixed example values inside the phone of the intro.
    demo: {
      german: "Deutsch",
      maths: "Mathe",
      english: "Englisch",
      biology: "Bio",
      history: "Geschichte",
      halfYear: "HJ {{index}}",
      counted: "zählt",
      notCounted: "zählt nicht",
      inclusion: "{{count}} von {{total}} Kursen zählen",
      atLeast: "mindestens {{points}}",
      states: "16 Bundesländer",
    },
    worries: {
      title: "Was stresst dich?",
      intro: "Wähle alles, was am Abi auf dich zutrifft.",
      options: {
        rules: "Ich blick bei den Regeln nicht durch",
        inclusion: "Ich weiß nicht, welche Kurse am Ende zählen",
        focus: "Ich weiß nicht, wo sich Lernen wirklich lohnt",
        exams: "Ich versteh nicht, wie die Prüfungen zählen",
        standing: "Ich weiß nicht, wo ich gerade stehe",
        trust: "Ich trau Rechnern nicht, ob sie für mein Bundesland stimmen",
      },
    },
    mirror: {
      you: "Du hast gesagt",
      quote: "„{{text}}“",
      rules: {
        text: "Musst du auch nicht. AbiApp kennt die Regeln deines Bundeslandes und rechnet genau danach.",
        blockI: "Block I",
        blockIText: "deine Kurse",
        blockII: "Block II",
        blockIIText: "deine Prüfungen",
        upTo: "bis {{points}}",
        total: "Gesamt",
      },
      inclusion: {
        text: "Nicht jeder Kurs muss zählen. AbiApp findet die beste gültige Einbringung und zeigt dir, welche Halbjahre drin sind.",
      },
      focus: {
        text: "Du siehst, in welchen Kursen jeder Punkt zählt und wo du Druck rausnehmen kannst.",
        full: "jeder Punkt zählt",
        relaxed: "Druck raus",
      },
      exams: {
        text: "Deine Prüfungen bringen ein Drittel deiner Punkte. AbiApp zeigt dir, welche Fächer als Prüfungsfach gehen und was jede Prüfung für deinen Schnitt bringt.",
        courses: "Kurse",
        exams: "Prüfungen",
        share: "{{points}} von 900",
      },
      standing: {
        text: "Trag deine Noten ein und du siehst sofort deinen Schnitt, mit Prognose für alles, was noch kommt.",
      },
      trust: {
        text: "AbiApp rechnet für jedes der 16 Bundesländer nach der Verordnung deines Jahrgangs. Quellen und Annahmen stehen offen in der App, der Code ist Open Source.",
        states: "Alle 16 Bundesländer",
        sources: "Verordnung und Paragrafen als Quelle",
        tests: "Durchgerechnete Beispiele für jedes Land",
        openSource: "Open Source",
      },
    },
    state: {
      title: "Bundesland",
      intro: "Wo machst du Abitur? Danach richtet sich die ganze Rechnung.",
    },
    year: {
      title: "Abiturjahrgang",
      intro: "In welchem Jahr schreibst du deine Abiturprüfungen?",
      footer:
        "AbiApp wählt die Regeln passend zum Jahrgang. Ändern kannst du sie in den Einstellungen.",
    },
    rules: {
      title: "Deine Regeln",
      intro: "Nach diesen Regeln rechnet AbiApp für dich.",
      blockI: "Block I",
      blockICourses: {
        one: "{{count}} Kurs, bis 600 Punkte",
        other: "{{count}} Kurse, bis 600 Punkte",
      },
      blockICoursesRange: "{{min}} bis {{max}} Kurse, bis 600 Punkte",
      blockII: "Block II",
      blockIIText: "Abiturprüfungen, bis 300 Punkte",
      basis: "Grundlage",
      basisFooter:
        "Tippe auf eine Quelle, um sie zu öffnen. Die Annahmen dahinter findest du später unter „Regeln anzeigen“.",
    },
    goal: {
      title: "Dein Ziel",
      intro: "Welchen Schnitt willst du schaffen?",
      need: "Dafür brauchst du {{points}} von 900 Punkten.",
      a11y: "Ziel {{grade}}. Dafür brauchst du {{points}} von 900 Punkten.",
    },
    subjects: {
      title: "Deine Fächer",
      intro:
        "Wähle alle Fächer, die du in der Qualifikationsphase belegst. Fehlt eins, lege es unten selbst an.",
    },
    levels: {
      intro: "Welche Fächer belegst du als {{name}}? {{need}}",
    },
    exams: {
      title: "Prüfungsfächer",
      intro:
        "In welchen Fächern legst du deine Abiturprüfungen ab? Das geht auch später.",
      open: {
        one: "Noch 1 Prüfungsfach offen.",
        other: "Noch {{count}} Prüfungsfächer offen.",
      },
    },
    accent: {
      title: "Deine Farbe",
      intro:
        "In welcher Farbe willst du dein Abi sehen? Ändern kannst du sie jederzeit in den Einstellungen.",
      preview: "Vorschau",
    },
    source: {
      title: "Letzte Frage",
      intro: "Woher kennst du AbiApp?",
      tiktok: "TikTok",
      instagram: "Instagram",
      friends: "Freunde oder Mitschüler",
      school: "Schule oder Lehrkraft",
      appStore: "App Store",
      playStore: "Play Store",
      google: "Google",
      other: "Sonstiges",
    },
    done: {
      title: "Fertig",
      building: {
        rules: "Regeln für {{state}}",
        subjects: {
          one: "{{count}} Fach",
          other: "{{count}} Fächer",
        },
        exams: {
          one: "{{count}} Prüfungsfach",
          other: "{{count}} Prüfungsfächer",
        },
        goal: "Ziel {{grade}}",
      },
      heading: "Alles bereit",
      knowHeading: "Jetzt weißt du, was du brauchst.",
      text: "Trage deine erste Note ein. Die Übersicht zeigt dir sofort deinen Schnitt.",
      goalLabel: "Dein Ziel",
      needLabel: "Für {{grade}} brauchst du im Schnitt",
      needValue: "{{points}} Punkte",
      needText:
        "In allen offenen Kursen und Prüfungen. Mit jeder Note, die du einträgst, wird die Rechnung genauer.",
      needUnreachable:
        "Mit 15 Punkten überall reicht es nicht für {{grade}}. Du kannst dein Ziel jederzeit ändern.",
      goalText: "Trage deine erste Note ein, dann siehst du, wo du stehst.",
      firstGrade: "Erste Note eintragen",
      examsLater:
        "Die Prüfungsfächer fehlen noch. Du kannst sie in den Einstellungen festlegen.",
      summary: "Deine Angaben",
      subjects: "Fächer",
      elevated: "{{name}}: {{subjects}}",
      addSubject: "Fach hinzufügen",
    },
  },
};
