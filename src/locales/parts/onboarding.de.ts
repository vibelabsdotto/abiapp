// German strings of the first-run flow: motion intro, story (goal, four
// questions and their scenes), setup steps, colour and result. Source of truth; en
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
      claim: "Schaff den Schnitt,\nden du willst.",
      beats: {
        standing: "Sieh, wo du stehst.",
        counts: "Sieh, was wirklich zählt.",
        needs: "Sieh, was du noch brauchst.",
        states: "Gerechnet nach den Regeln deines Bundeslandes.",
      },
      promise: "Kostenlos · Ohne Konto · Deine Noten bleiben bei dir",
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
      physics: "Physik",
      halfYear: "HJ {{index}}",
      counted: "zählt",
      notCounted: "zählt nicht",
      inclusion: "{{count}} von {{total}} Kursen zählen",
      atLeast: "mindestens {{points}} Punkte",
      nextExam: "{{subject}} · nächste Klausur",
      rules: "Gerechnet nach {{source}}",
      short: {
        german: "De",
        maths: "Ma",
        english: "En",
        biology: "Bio",
        history: "Ge",
        physics: "Ph",
      },
      states: "16 Bundesländer",
    },
    goal: {
      title: "Welchen Schnitt willst du schaffen?",
      intro: "Du kannst ihn jederzeit ändern.",
      need: "Für {{grade}} brauchst du {{points}} von 900 Punkten.",
      a11y: "Ziel {{grade}}. Dafür brauchst du {{points}} von 900 Punkten.",
    },
    story: {
      you: "Du: {{answer}}",
      replay: "Tippen, um es noch mal zu sehen",
      example: "Beispiel",
      explain: {
        question:
          "Mal ehrlich: Könntest du erklären, wie aus deinen Noten dein Abischnitt wird?",
        answers: {
          yes: "Klar, kann ich",
          roughly: "So ungefähr",
          no: "Keine Ahnung",
        },
        headline: {
          yes: "Dann weißt du: Es ist viel Rechnerei.",
          roughly: "Ungefähr reicht ab jetzt.",
          no: "Musst du auch nicht.",
        },
        text: "Kurse bringen bis zu 600 Punkte, Prüfungen bis zu 300. AbiApp rechnet das nach den Regeln deines Bundeslandes.",
        courses: "Kurse",
        exams: "Prüfungen",
        upTo: "von {{points}}",
        a11y: "Animation: Noten fallen in zwei Bereiche, Kurse bis 600 und Prüfungen bis 300 Punkte. Zusammen ergeben sie {{points}} von 900 Punkten, dein Ziel {{grade}}.",
      },
      focus: {
        question: "Zwei Klausuren in einer Woche. Für welche lernst du mehr?",
        answers: {
          harder: "Für die schwerere",
          counts: "Für die, die mehr zählt",
          both: "Für beide gleich",
          first: "Für die, die zuerst kommt",
        },
        headline: {
          counts: "Genau. Nur: Welche ist das?",
          other: "Kommt drauf an, welche zählt.",
        },
        text: "Nicht jeder Kurs muss ins Abi. AbiApp zeigt dir, wo jeder Punkt zählt und wo du Druck rausnehmen kannst.",
        counted: "zählt",
        notCounted: "zählt nicht",
        inclusion: "{{count}} von {{total}} Kursen zählen",
        total: "Abi-Punkte",
        plus: "+1",
        a11y: "Animation, Beispiel: In einem Raster aus Fächern und Halbjahren zählen {{count}} von {{total}} Kursen. Ein Punkt mehr in einem Kurs, der nicht zählt, lässt die Abi-Punkte bei {{before}}. Ein Punkt mehr in einem Kurs, der zählt, hebt sie auf {{after}}.",
      },
      examShare: {
        question:
          "Was schätzt du: Wie viel von deinem Abi entscheidet sich in den Prüfungen?",
        answers: {
          tenth: "Ein Zehntel",
          quarter: "Ein Viertel",
          third: "Ein Drittel",
          half: "Die Hälfte",
        },
        headline: {
          right: "Richtig, ein Drittel.",
          other: "Es ist ein Drittel.",
        },
        text: "300 von 900 Punkten kommen aus wenigen Prüfungen. Jede einzelne zählt mindestens doppelt so viel wie ein Kurshalbjahr.",
        courses: "Kurse",
        exams: "Prüfungen",
        course: "1 Kurshalbjahr",
        courseMax: "bis 30",
        exam: "1 Prüfung",
        examMax: "bis 60 oder 75",
        examSubject: "geht als Prüfungsfach",
        a11y: "Animation: Ein Balken mit 900 Punkten, davon ein Drittel, 300 Punkte, aus den Prüfungen. Eine Prüfung ist mindestens doppelt so viel wert wie ein Kurshalbjahr. Darunter Fächer mit Haken für „geht als Prüfungsfach“.",
      },
      calculatedBefore: {
        question: "Hast du deinen Schnitt schon mal ausgerechnet?",
        answers: {
          app: "Ja, mit einer App",
          web: "Ja, mit einem Rechner im Netz",
          self: "Ja, selbst oder mit Excel",
          never: "Noch nie",
        },
        headline: {
          tool: "Und stimmte er für dein Bundesland?",
          self: "Respekt. Ab jetzt rechnet AbiApp.",
          never: "Dann gleich richtig.",
        },
        text: "16 Bundesländer, 16 Verordnungen. AbiApp rechnet nach deiner, nennt die Paragrafen dazu, und der Code ist offen einsehbar.",
        rule: "Block I",
        source: "Quelle: {{source}}",
        choose: "Mein Bundesland wählen",
        a11y: "Animation: Die 16 Bundesländer bekommen nacheinander einen Haken. Eine Regel klappt auf und zeigt ihre Quelle, {{source}}. Dann ordnen sich die Länder zu einer Liste.",
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
      title: "In welcher Farbe willst du dein Abi sehen?",
      intro: "Du kannst sie jederzeit in den Einstellungen ändern.",
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
