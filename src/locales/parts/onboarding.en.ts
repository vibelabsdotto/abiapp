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
      claim: "Get the average\nyou want.",
      beats: {
        standing: "See where you stand.",
        counts: "See what really counts.",
        needs: "See what you still need.",
        states: "Calculated by the rules of your state.",
      },
      promise: "Free · No account · Your grades stay with you",
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
      physics: "Physics",
      halfYear: "Term {{index}}",
      counted: "counts",
      notCounted: "doesn't count",
      inclusion: "{{count}} of {{total}} courses count",
      atLeast: "at least {{points}} points",
      nextExam: "{{subject}} · next exam",
      rules: "Calculated by {{source}}",
      short: {
        german: "Ger",
        maths: "Ma",
        english: "Eng",
        biology: "Bio",
        history: "His",
        physics: "Phy",
      },
      states: "16 states",
    },
    goal: {
      title: "What average do you want to get?",
      intro: "You can change it any time.",
      need: "For {{grade}} you need {{points}} of 900 points.",
      a11y: "Goal {{grade}}. That takes {{points}} of 900 points.",
    },
    story: {
      you: "You: {{answer}}",
      replay: "Tap to watch again",
      example: "Example",
      explain: {
        question:
          "Be honest: could you explain how your grades turn into your Abitur average?",
        answers: {
          yes: "Sure, I could",
          roughly: "Roughly",
          no: "No idea",
        },
        headline: {
          yes: "Then you know: it's a lot of maths.",
          roughly: "From now on, roughly is enough.",
          no: "You don't have to.",
        },
        text: "Courses bring up to 600 points, exams up to 300. AbiApp adds it up by the rules of your state.",
        courses: "Courses",
        exams: "Exams",
        upTo: "of {{points}}",
        a11y: "Animation: grades drop into two areas, courses up to 600 and exams up to 300 points. Together they make {{points}} of 900 points, your goal of {{grade}}.",
      },
      focus: {
        question: "Two tests in one week. Which one do you study more for?",
        answers: {
          harder: "The harder one",
          counts: "The one that counts more",
          both: "Both the same",
          first: "The one that comes first",
        },
        headline: {
          counts: "Exactly. But which one is it?",
          other: "Depends on which one counts.",
        },
        text: "Not every course has to count. AbiApp shows you where every point counts and where you can ease off.",
        counted: "counts",
        notCounted: "doesn't count",
        inclusion: "{{count}} of {{total}} courses count",
        total: "Abitur points",
        plus: "+1",
        a11y: "Animation, example: in a grid of subjects and terms, {{count}} of {{total}} courses count. One more point in a course that doesn't count leaves the Abitur points at {{before}}. One more point in a course that counts raises them to {{after}}.",
      },
      examShare: {
        question:
          "Take a guess: how much of your Abitur is decided in the exams?",
        answers: {
          tenth: "A tenth",
          quarter: "A quarter",
          third: "A third",
          half: "Half",
        },
        headline: {
          right: "Right, a third.",
          other: "It's a third.",
        },
        text: "300 of 900 points come from a few exams. Each one counts at least twice as much as a course term.",
        courses: "Courses",
        exams: "Exams",
        course: "2 course terms",
        courseMax: "up to 30 each",
        exam: "1 exam",
        examMax: "up to 60 or 75",
        examSubject: "can be an exam subject",
        a11y: "Animation: a bar of 900 points, a third of it, 300 points, from the exams. Two course terms of 30 points each stack as high as a single exam of 60. Below, subjects get a check for “can be an exam subject”.",
      },
      calculatedBefore: {
        question: "Have you ever worked out your average?",
        answers: {
          app: "Yes, with an app",
          web: "Yes, with a calculator online",
          self: "Yes, myself or in Excel",
          never: "Never",
        },
        headline: {
          tool: "And was it right for your state?",
          self: "Respect. From now on, AbiApp does the maths.",
          never: "Then let's get it right from the start.",
        },
        text: "16 states, 16 regulations. AbiApp calculates by yours, names the sections behind it, and the code is open for anyone to read.",
        rule: "Block I",
        source: "Source: {{source}}",
        choose: "Choose my state",
        a11y: "Animation: the 16 states get a check one after another. A rule opens and shows its source, {{source}}. Then the states line up into a list.",
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
      title: "Which colour do you want to see your Abitur in?",
      intro: "You can change it any time in Settings.",
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
      knowHeading: "Now you know what it takes.",
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
