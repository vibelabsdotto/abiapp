// English strings of the first-run flow. Keep keys in sync with
// onboarding.de.ts (the source of truth).

export const onboardingEN = {
  onboarding: {
    next: "Continue",
    later: "Decide later",
    skip: "Skip",
    finish: "Open overview",
    step: "Step {{step}} of {{total}}",
    fixIssue: "You can continue once the note in the list is resolved.",
    welcome: {
      claim: "Get the Abitur grade\nyou want.",
      beats: {
        standing: "See where you stand.",
        counts: "See what counts.",
        needs: "See what you still need.",
        states: "By the rules of your state.",
      },
      promise: "Free · No account · Your grades are yours",
      a11y: "Preview of the app: your average as an arch, the courses that count, what your goal takes, and the rules of all 16 states.",
      start: "Get started",
      restore: "Restore backup",
    },
    demo: {
      german: "German",
      maths: "Maths",
      english: "English",
      biology: "Biology",
      history: "History",
      halfYear: "Term {{index}}",
      counted: "counts",
      notCounted: "doesn't count",
      inclusion: "{{count}} of {{total}} courses count",
      atLeast: "at least {{points}}",
      states: "16 states",
    },
    worries: {
      title: "What stresses you?",
      intro:
        "What stresses you most about the Abitur? Pick everything that applies.",
      options: {
        rules: "I don't get the rules",
        inclusion: "I don't know which courses count in the end",
        focus: "I don't know where studying really pays off",
        exams: "I don't understand how the exams count",
        standing: "I don't know where I stand right now",
        trust: "I don't trust calculators to be right for my state",
      },
    },
    mirror: {
      you: "You said",
      quote: "“{{text}}”",
      rules: {
        text: "You don't have to. AbiApp knows the rules of your state and calculates exactly by them.",
        blockI: "Block I",
        blockIText: "your courses",
        blockII: "Block II",
        blockIIText: "your exams",
        upTo: "up to {{points}}",
        total: "Total",
      },
      inclusion: {
        text: "Not every course has to count. AbiApp finds the best valid selection and shows you which terms are in.",
      },
      focus: {
        text: "You see in which courses every point counts and where you can ease off.",
        full: "every point counts",
        relaxed: "ease off",
      },
      exams: {
        text: "Your exams bring a third of your points: 300 of 900. AbiApp shows what each exam does for your average.",
        courses: "Courses",
        exams: "Exams",
        share: "{{points}} of 900",
      },
      standing: {
        text: "Enter your grades and you see your average right away, with a forecast for everything still to come.",
      },
      trust: {
        text: "AbiApp calculates each of the 16 states by the regulation for your year. Sources and assumptions are open in the app, and the code is open source.",
        states: "All 16 states",
        sources: "Regulation and sections as the source",
        tests: "Worked examples for every state",
        openSource: "Open source",
      },
    },
    state: {
      title: "State",
      intro:
        "Where do you take your Abitur? The whole calculation depends on it.",
    },
    year: {
      title: "Abitur year",
      intro: "In which year do you take your Abitur exams?",
      footer:
        "AbiApp picks the rules that match your year. You can change them in Settings.",
    },
    rules: {
      title: "Your rules",
      intro: "These are the rules AbiApp calculates by for you.",
      blockI: "Block I",
      blockICourses: {
        one: "{{count}} course, up to 600 points",
        other: "{{count}} courses, up to 600 points",
      },
      blockICoursesRange: "{{min}} to {{max}} courses, up to 600 points",
      blockII: "Block II",
      blockIIText: "Abitur exams, up to 300 points",
      basis: "Legal basis",
      basisFooter:
        "Tap a source to open it. You'll find the assumptions behind it later under “Show rules”.",
    },
    goal: {
      title: "Your goal",
      intro: "Which average do you want to reach?",
      need: "You need {{points}} of 900 points for it.",
      a11y: "Goal {{grade}}. You need {{points}} of 900 points for it.",
    },
    subjects: {
      title: "Your subjects",
      intro:
        "Pick every subject you take in the qualification phase. If one is missing, add it below.",
    },
    levels: {
      intro: "Which subjects do you take as {{name}}? {{need}}",
    },
    exams: {
      title: "Exam subjects",
      intro:
        "In which subjects do you take your Abitur exams? You can also do this later.",
      open: {
        one: "1 exam subject still open.",
        other: "{{count}} exam subjects still open.",
      },
    },
    accent: {
      title: "Your colour",
      intro:
        "Which colour do you want to see your Abitur in? You can change it any time in Settings.",
      preview: "Preview",
    },
    source: {
      title: "Last question",
      intro: "How did you hear about AbiApp?",
      tiktok: "TikTok",
      instagram: "Instagram",
      friends: "Friends or classmates",
      school: "School or a teacher",
      appStore: "App Store",
      playStore: "Play Store",
      google: "Google",
      other: "Other",
    },
    done: {
      title: "Done",
      building: {
        rules: "Rules for {{state}}",
        subjects: {
          one: "{{count}} subject",
          other: "{{count}} subjects",
        },
        exams: {
          one: "{{count}} exam subject",
          other: "{{count}} exam subjects",
        },
        goal: "Goal {{grade}}",
      },
      heading: "All set",
      text: "Enter your first grade. The overview shows your average right away.",
      goalLabel: "Your goal",
      needLabel: "For {{grade}} you need on average",
      needValue: "{{points}} points",
      needText:
        "Across all open courses and exams. Every grade you enter makes the calculation more precise.",
      needUnreachable:
        "Even 15 points everywhere is not enough for {{grade}}. You can change your goal any time.",
      goalText: "Enter your first grade to see where you stand.",
      firstGrade: "Enter first grade",
      examsLater:
        "Your exam subjects are still open. You can set them in Settings.",
      summary: "Your setup",
      subjects: "Subjects",
      elevated: "{{name}}: {{subjects}}",
      addSubject: "Add subject",
    },
  },
};
