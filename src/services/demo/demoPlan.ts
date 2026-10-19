// Rule-conform demo data plan (pure, no database access).
//
// Derives a plausible student from the ruleset: typical subjects plus the
// state's seminar subjects, a valid elevated-level and exam-subject choice
// (checked with validateSetup, alternatives tried in preference order),
// grades in the first three half-years, official results for the first two,
// two Unterkurse, half-year goals, two exam results and all extras of the
// chosen exam variant. Every candidate is evaluated with the engine; the
// first one that is admitted and yields a grade wins. Deterministic: the
// same ruleset always gives the same plan.

import { evaluate, halfYearPrognosis, validateSetup } from "@domain/index";
import type {
  AbiturEvaluation,
  CatalogSubject,
  CourseLevel,
  EngineCourse,
  EngineInput,
  EngineSubject,
  ExamComponentInfo,
  ExamSlot,
  ExamVariantInfo,
  GradeKind,
  Issue,
  RulesetSummary,
} from "@domain/model";
import {
  componentNeedsSubject,
  defaultHalfYearsOf,
} from "@stores/domainAccess";

export interface DemoGrade {
  kind: GradeKind;
  points: number;
  title: string;
  /** Months after the half-year start (date is computed when writing). */
  monthOffset: number;
  day: number;
}

export interface DemoCourse {
  halfYear: number;
  taken: boolean;
  grades: DemoGrade[];
  officialPoints: number | null;
  targetPoints: number | null;
}

export interface DemoSubject {
  entry: CatalogSubject;
  level: CourseLevel;
  examSlot: ExamSlot | null;
  courses: DemoCourse[];
}

export interface DemoExam {
  slot: ExamSlot;
  mainPoints: number | null;
  oralPoints: number | null;
}

export interface DemoPlan {
  ruleset: RulesetSummary;
  examVariantId: string | null;
  subjects: DemoSubject[];
  exams: DemoExam[];
  extras: Record<string, number>;
  input: EngineInput;
  evaluation: AbiturEvaluation;
  setupIssues: Issue[];
  /** True if the plan is admitted, has a grade and no error issues. */
  valid: boolean;
  /** Failed acceptance criteria of the returned plan (empty if valid). */
  problems: string[];
}

/** Catalog keys in pick order; the first available key of a group wins. */
const SUBJECT_GROUPS: readonly (readonly string[])[] = [
  ["de"],
  ["ma"],
  ["en"],
  ["fr", "la", "es", "ru", "it"],
  ["bio"],
  ["ch"],
  ["ph"],
  ["ge"],
  ["pol", "grw", "sowi", "pw", "soz", "sk_ge", "wr", "wi"],
  ["geo"],
  ["eth", "rel_ev", "rel_kath", "re", "phil"],
  ["ku", "mu", "ds"],
  ["inf"],
  ["sp"],
];

/** Elevated-level preference (earlier = more likely an LK/eA). */
const ELEVATED_PREFERENCE = [
  "ma",
  "de",
  "en",
  "bio",
  "ge",
  "ph",
  "ch",
  "fr",
  "la",
  "es",
  "ru",
  "pol",
  "geo",
  "ku",
];

/** Exam-subject preference per component kind. */
const EXAM_PREFERENCE: Record<"written" | "oral" | "other", string[]> = {
  written: ["de", "ma", "en", "ge", "bio", "fr", "la", "es", "ru", "ch", "ph"],
  oral: [
    "ge",
    "bio",
    "geo",
    "pol",
    "grw",
    "sowi",
    "en",
    "ch",
    "ph",
    "eth",
    "rel_ev",
    "rel_kath",
    "re",
    "inf",
    "ku",
    "mu",
    "fr",
    "la",
    "es",
    "de",
    "ma",
  ],
  other: ["geo", "ku", "inf", "pol", "grw", "bio", "ge", "mu", "ch", "ph"],
};

/** Typical level per subject (points) so the demo looks plausible. */
const BASE_POINTS: Record<string, number> = {
  de: 10,
  ma: 12,
  en: 11,
  fr: 9,
  la: 9,
  es: 10,
  ru: 9,
  it: 10,
  bio: 11,
  ch: 9,
  ph: 9,
  ge: 12,
  geo: 10,
  eth: 12,
  ku: 12,
  mu: 12,
  inf: 13,
  sp: 13,
};

const GRADED_HALF_YEARS = 3;
const OFFICIAL_HALF_YEARS = 2;
const MAX_EVALUATIONS = 40;
const MAX_ELEVATED_COMBOS = 120;
const MAX_SLOT_VALIDATIONS = 600;
/** Validation budget of the first pass that also avoids setup warnings. */
const STRICT_VALIDATIONS = 4000;

/** Small deterministic PRNG so every seed produces the same data. */
const createRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hash = (text: string) => {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

const subjectId = (key: string) => `demo:${key}`;

// ---------------------------------------------------------------------------
// Subjects, elevated level, exam slots
// ---------------------------------------------------------------------------

const pickSubjects = (ruleset: RulesetSummary): CatalogSubject[] => {
  const byKey = new Map(ruleset.catalog.map((entry) => [entry.key, entry]));
  const picked: CatalogSubject[] = [];
  for (const group of SUBJECT_GROUPS) {
    const key = group.find((candidate) => byKey.has(candidate));
    if (key) picked.push(byKey.get(key) as CatalogSubject);
  }
  // Seminar subjects of the state (W-Seminar, Seminarfach, Projektkurs).
  for (const entry of ruleset.catalog) {
    if (entry.tags.includes("seminar") && !picked.includes(entry)) {
      picked.push(entry);
    }
  }
  return picked;
};

const rankIn = (list: readonly string[], key: string) => {
  const index = list.indexOf(key);
  return index === -1 ? list.length : index;
};

/** Elevated sets of the allowed size, most typical first. */
function* elevatedCombos(
  ruleset: RulesetSummary,
  picked: CatalogSubject[],
): Generator<Set<string>> {
  const { min, max } = ruleset.elevatedSubjects;
  const size = Math.min(max, Math.max(min, 2));
  const pool = picked
    .filter((entry) => entry.canBeElevated)
    .map((entry) => entry.key)
    .sort(
      (a, b) => rankIn(ELEVATED_PREFERENCE, a) - rankIn(ELEVATED_PREFERENCE, b),
    );
  if (size === 0) {
    yield new Set();
    return;
  }
  const combos: number[][] = [];
  const walk = (start: number, current: number[]) => {
    if (current.length === size) {
      combos.push([...current]);
      return;
    }
    for (let index = start; index < pool.length; index += 1) {
      current.push(index);
      walk(index + 1, current);
      current.pop();
    }
  };
  walk(0, []);
  const cost = (combo: number[]) =>
    combo.reduce((sum, index) => sum + index, 0);
  combos.sort((a, b) => cost(a) - cost(b));
  for (const combo of combos.slice(0, MAX_ELEVATED_COMBOS)) {
    yield new Set(combo.map((index) => pool[index]));
  }
}

const variantOrder = (ruleset: RulesetSummary): ExamVariantInfo[] => {
  // Plain written/oral variants first, BLL and seminar variants later.
  const special = (variant: ExamVariantInfo) =>
    variant.components.some(
      (component) => !componentNeedsSubject(component) || component.extraId,
    );
  return [...ruleset.examVariants].sort(
    (a, b) => Number(special(a)) - Number(special(b)),
  );
};

interface Selection {
  ruleset: RulesetSummary;
  variant: ExamVariantInfo | null;
  picked: CatalogSubject[];
  elevated: Set<string>;
  slots: Map<ExamSlot, string>;
}

const coursesOf = (
  ruleset: RulesetSummary,
  entry: CatalogSubject,
): EngineCourse[] => {
  const takenHalfYears = defaultHalfYearsOf(entry);
  return ruleset.halfYears.map((_, halfYear) => ({
    subjectId: subjectId(entry.key),
    halfYear,
    taken: !takenHalfYears || takenHalfYears.includes(halfYear),
    officialPoints: null,
    inclusion: "auto",
    grades: [],
    targetPoints: null,
  }));
};

const setupInput = (selection: Selection): EngineInput => {
  const slotOf = new Map(
    [...selection.slots].map(([slot, key]) => [key, slot] as const),
  );
  const subjects: EngineSubject[] = selection.picked.map((entry) => ({
    id: subjectId(entry.key),
    catalogKey: entry.key,
    name: entry.name,
    field: entry.field,
    tags: entry.tags,
    level: selection.elevated.has(entry.key) ? "elevated" : "basic",
    examSlot: slotOf.get(entry.key) ?? null,
    examWeightPercent: selection.ruleset.defaults.examWeightPercent,
  }));
  return {
    rulesetId: selection.ruleset.id,
    examVariantId: selection.variant?.id ?? null,
    subjects,
    courses: selection.picked.flatMap((entry) =>
      coursesOf(selection.ruleset, entry),
    ),
    exams: [],
    extras: {},
  };
};

const errorsOf = (issues: Issue[]) =>
  issues.filter((issue) => issue.severity === "error");

const warningsOf = (issues: Issue[]) =>
  issues.filter((issue) => issue.severity === "warning");

/** Shared validation budget of one planning pass. */
interface Budget {
  validations: number;
  limit: number;
}

const slotPreference = (component: ExamComponentInfo) =>
  component.kind === "written"
    ? EXAM_PREFERENCE.written
    : component.kind === "oral"
      ? EXAM_PREFERENCE.oral
      : EXAM_PREFERENCE.other;

/**
 * Backtracking over the components that need a subject. Partial choices
 * are pruned as soon as validateSetup reports an error for an assigned
 * slot or subject; the complete choice must be free of errors (in strict
 * mode also free of warnings, e.g. NI "kein bekannter Schwerpunkt").
 */
const assignSlots = (
  base: Omit<Selection, "slots">,
  strict: boolean,
  budget: Budget,
): Map<ExamSlot, string> | null => {
  const components = (base.variant?.components ?? []).filter(
    componentNeedsSubject,
  );
  const order = new Map(base.picked.map((entry, index) => [entry.key, index]));
  let validations = 0;
  const slots = new Map<ExamSlot, string>();

  const check = (complete: boolean) => {
    validations += 1;
    budget.validations += 1;
    const all = validateSetup(setupInput({ ...base, slots }));
    const issues = errorsOf(all);
    if (complete) {
      return issues.length === 0 && (!strict || warningsOf(all).length === 0);
    }
    const assigned = new Set([...slots.values()].map(subjectId));
    return !issues.some(
      (issue) =>
        (issue.slot !== undefined && slots.has(issue.slot)) ||
        (issue.subjectId !== undefined && assigned.has(issue.subjectId)),
    );
  };

  const walk = (index: number): boolean => {
    if (index === components.length) return check(true);
    const component = components[index];
    const used = new Set(slots.values());
    const preference = slotPreference(component);
    const candidates = base.picked
      .filter((entry) => entry.canBeExam && !used.has(entry.key))
      .filter((entry) => {
        if (component.level === "any") return true;
        return (
          (component.level === "elevated") === base.elevated.has(entry.key)
        );
      })
      .sort((a, b) => {
        // Unused elevated subjects first for "any" slots (their exams are
        // usually written), then the preference list.
        const elevatedFirst =
          component.level === "any" && component.kind === "written"
            ? Number(!base.elevated.has(a.key)) -
              Number(!base.elevated.has(b.key))
            : 0;
        return (
          elevatedFirst ||
          rankIn(preference, a.key) - rankIn(preference, b.key) ||
          (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0)
        );
      });
    for (const candidate of candidates) {
      if (validations >= MAX_SLOT_VALIDATIONS) return false;
      if (budget.validations >= budget.limit) return false;
      slots.set(component.slot, candidate.key);
      const complete = index + 1 === components.length;
      if ((complete || check(false)) && walk(index + 1)) return true;
      slots.delete(component.slot);
    }
    return false;
  };

  return walk(0) ? new Map(slots) : null;
};

// ---------------------------------------------------------------------------
// Grades, results, extras
// ---------------------------------------------------------------------------

const OTHER_TITLES = ["Mitarbeit", "Test", "Referat", "Kurzkontrolle"];

/** Fixed Unterkurs grades: prognosis 4 points (exam 3, other 5/4/3). */
const weakGrades = (): DemoGrade[] => [
  { kind: "exam", points: 3, title: "Klausur 1", monthOffset: 2, day: 14 },
  { kind: "other", points: 5, title: "Mitarbeit", monthOffset: 1, day: 9 },
  { kind: "other", points: 4, title: "Test", monthOffset: 3, day: 20 },
  { kind: "other", points: 3, title: "Referat", monthOffset: 4, day: 6 },
];

/** Two Unterkurse in basic, non-exam subjects (a science, a language). */
const pickUnterkurse = (subjects: DemoSubject[]) => {
  const eligible = (subject: DemoSubject, halfYear: number) =>
    subject.level === "basic" &&
    subject.examSlot === null &&
    subject.entry.field !== "sport" &&
    !subject.entry.tags.some((tag) =>
      ["german", "math", "seminar"].includes(tag),
    ) &&
    subject.courses[halfYear]?.taken === true;
  const choose = (halfYear: number, preferred: string[], taken: Set<string>) =>
    [...subjects]
      .filter(
        (subject) =>
          eligible(subject, halfYear) && !taken.has(subject.entry.key),
      )
      .sort(
        (a, b) =>
          rankIn(preferred, a.entry.key) - rankIn(preferred, b.entry.key),
      )[0];
  const result = new Set<string>();
  const chosen = new Set<string>();
  const first = choose(1, ["ch", "ph", "geo", "inf", "bio"], chosen);
  if (first) {
    result.add(`${first.entry.key}#1`);
    chosen.add(first.entry.key);
  }
  const second = choose(
    2,
    ["fr", "la", "es", "ru", "it", "ph", "geo", "ch"],
    chosen,
  );
  if (second) result.add(`${second.entry.key}#2`);
  return result;
};

const fillCourses = (
  selection: Selection,
  subjects: DemoSubject[],
  random: () => number,
) => {
  const weak = pickUnterkurse(subjects);
  const weight = selection.ruleset.defaults.examWeightPercent;
  for (const subject of subjects) {
    const key = subject.entry.key;
    const isSport = subject.entry.field === "sport";
    const base = clamp(
      (BASE_POINTS[key] ?? 11) + Math.floor(random() * 3) - 1,
      8,
      13,
    );
    for (const course of subject.courses) {
      if (!course.taken || course.halfYear >= GRADED_HALF_YEARS) continue;
      if (weak.has(`${key}#${course.halfYear}`)) {
        course.grades = weakGrades();
      } else {
        const center = base + (course.halfYear === 2 ? 1 : 0);
        const examCount = isSport ? 0 : subject.level === "elevated" ? 2 : 1;
        const otherCount = 2 + Math.floor(random() * 2);
        const kinds: GradeKind[] = [
          ...Array<GradeKind>(examCount).fill("exam"),
          ...Array<GradeKind>(otherCount).fill("other"),
        ];
        course.grades = kinds.map((kind, index) => ({
          kind,
          points: clamp(center + (random() * 4 - 2), 0, 15),
          title:
            kind === "exam"
              ? `Klausur ${index + 1}`
              : OTHER_TITLES[index % OTHER_TITLES.length],
          monthOffset: Math.min(4, index),
          day: 5 + Math.floor(random() * 20),
        }));
      }
      if (course.halfYear < OFFICIAL_HALF_YEARS) {
        course.officialPoints = halfYearPrognosis(
          course.grades.map((grade, index) => ({
            id: String(index),
            kind: grade.kind,
            points: grade.points,
            weight: 1,
          })),
          weight,
        ).points;
      }
    }
  }
  // Goals for the current half-year in two subjects.
  for (const [key, target] of [
    ["ma", 13],
    ["de", 11],
  ] as const) {
    const course = subjects.find((subject) => subject.entry.key === key)
      ?.courses[GRADED_HALF_YEARS - 1];
    if (course?.taken) course.targetPoints = target;
  }
};

const basePointsOf = (subjects: DemoSubject[], key: string) => {
  const subject = subjects.find((item) => item.entry.key === key);
  const points = subject?.courses
    .flatMap((course) => course.grades)
    .map((grade) => grade.points);
  if (!points || points.length === 0) return 11;
  return Math.round(
    points.reduce((sum, value) => sum + value, 0) / points.length,
  );
};

/** Results for the first two exam subjects, P2 with an oral exam. */
const planExams = (selection: Selection, subjects: DemoSubject[]) => {
  const exams: DemoExam[] = [];
  const components = (selection.variant?.components ?? []).filter(
    (component) => componentNeedsSubject(component) && !component.extraId,
  );
  for (const component of components.slice(0, 2)) {
    const key = selection.slots.get(component.slot);
    if (!key) continue;
    const main = clamp(basePointsOf(subjects, key) + 1, 5, 15);
    const oral =
      exams.length === 1 && component.supplementaryOral
        ? clamp(main - 2, 5, 15)
        : null;
    exams.push({ slot: component.slot, mainPoints: main, oralPoints: oral });
  }
  // Components without exam subject (BLL, Seminarfach) get a result too.
  for (const component of selection.variant?.components ?? []) {
    if (componentNeedsSubject(component) || component.extraId) continue;
    exams.push({
      slot: component.slot,
      mainPoints: 12,
      oralPoints: component.partLabels?.oral ? 11 : null,
    });
  }
  return exams;
};

/**
 * Values for all extras. `optional` are extras bound to a component of
 * another exam variant (BW Seminarkurs, HH/SH BLL); they are kept only if
 * the engine counts them under the chosen variant (Block I).
 */
const planExtras = (selection: Selection) => {
  const { ruleset, variant } = selection;
  const ownIds = new Set(
    (variant?.components ?? []).flatMap((component) =>
      component.extraId ? [component.extraId] : [],
    ),
  );
  const boundElsewhere = new Set(
    ruleset.examVariants
      .filter((item) => item.id !== variant?.id)
      .flatMap((item) => item.components)
      .flatMap((component) => (component.extraId ? [component.extraId] : []))
      .filter((id) => !ownIds.has(id)),
  );
  const fixed: Record<string, number> = {};
  const optional: Record<string, number> = {};
  ruleset.extraInputs.forEach((extra, index) => {
    // Optional extras only count if they beat a regular course.
    const share = boundElsewhere.has(extra.id) ? 0.87 : 0.73 + index * 0.04;
    const value = extra.min + (extra.max - extra.min) * share;
    const target = boundElsewhere.has(extra.id) ? optional : fixed;
    target[extra.id] = clamp(value, extra.min, extra.max);
  });
  return { fixed, optional };
};

// ---------------------------------------------------------------------------
// Assembly and acceptance
// ---------------------------------------------------------------------------

const problemsOf = (evaluation: AbiturEvaluation, setupIssues: Issue[]) => {
  const problems: string[] = [];
  if (evaluation.blockI.admitted !== true) {
    problems.push(
      `blockI.admitted=${String(evaluation.blockI.admitted)}: ${evaluation.blockI.checks
        .filter((check) => check.passed !== true)
        .map((check) => `${check.id} (${check.detail ?? "–"})`)
        .join(", ")}`,
    );
  }
  if (evaluation.blockII.passed === false) {
    problems.push(
      `blockII.passed=false: ${evaluation.blockII.checks
        .filter((check) => check.passed === false)
        .map((check) => check.id)
        .join(", ")}`,
    );
  }
  if (evaluation.total.gradeTenths === null) problems.push("gradeTenths=null");
  if (evaluation.total.passed === false) problems.push("total.passed=false");
  for (const issue of [
    ...errorsOf(setupIssues),
    ...errorsOf(evaluation.issues),
  ]) {
    problems.push(`${issue.code}: ${issue.message}`);
  }
  return problems;
};

const buildPlan = (selection: Selection): DemoPlan => {
  const random = createRandom(hash(selection.ruleset.id));
  const slotOf = new Map(
    [...selection.slots].map(([slot, key]) => [key, slot] as const),
  );
  const subjects: DemoSubject[] = selection.picked.map((entry) => ({
    entry,
    level: selection.elevated.has(entry.key) ? "elevated" : "basic",
    examSlot: slotOf.get(entry.key) ?? null,
    courses: coursesOf(selection.ruleset, entry).map((course) => ({
      halfYear: course.halfYear,
      taken: course.taken,
      grades: [],
      officialPoints: null,
      targetPoints: null,
    })),
  }));
  fillCourses(selection, subjects, random);
  const exams = planExams(selection, subjects);
  const { fixed, optional } = planExtras(selection);
  const extras = { ...fixed };

  const input = setupInput(selection);
  input.courses = subjects.flatMap((subject) =>
    subject.courses.map((course) => ({
      subjectId: subjectId(subject.entry.key),
      halfYear: course.halfYear,
      taken: course.taken,
      officialPoints: course.officialPoints,
      inclusion: "auto" as const,
      grades: course.grades.map((grade, index) => ({
        id: `${subject.entry.key}:${course.halfYear}:${index}`,
        kind: grade.kind,
        points: grade.points,
        weight: 1,
      })),
      targetPoints: course.targetPoints,
    })),
  );
  input.exams = exams;
  input.extras = { ...extras };

  let evaluation = evaluate(input);
  for (const [id, value] of Object.entries(optional)) {
    const withExtra = { ...input, extras: { ...input.extras, [id]: value } };
    const result = evaluate(withExtra);
    const counted = result.blockI.included.some((item) => item.extraId === id);
    if (counted && problemsOf(result, []).length === 0) {
      extras[id] = value;
      input.extras = withExtra.extras;
      evaluation = result;
    }
  }
  const setupIssues = validateSetup(input);
  const problems = problemsOf(evaluation, setupIssues);
  return {
    ruleset: selection.ruleset,
    examVariantId: selection.variant?.id ?? null,
    subjects,
    exams,
    extras,
    input,
    evaluation,
    setupIssues,
    valid: problems.length === 0,
    problems,
  };
};

/** Best rule-conform plan for the ruleset (see file header). */
export function planDemoData(ruleset: RulesetSummary): DemoPlan {
  const picked = pickSubjects(ruleset);
  const variants: (ExamVariantInfo | null)[] = ruleset.examVariants.length
    ? variantOrder(ruleset)
    : [null];
  let best = null as DemoPlan | null;
  const rank = (plan: DemoPlan) =>
    plan.problems.length * 100 +
    warningsOf([...plan.setupIssues, ...plan.evaluation.issues]).length;
  // Pass 1 avoids setup warnings within a validation budget, pass 2 only
  // needs an error-free choice.
  for (const strict of [true, false]) {
    const budget: Budget = {
      validations: 0,
      limit: strict ? STRICT_VALIDATIONS : Number.POSITIVE_INFINITY,
    };
    let evaluations = 0;
    for (const variant of variants) {
      for (const elevated of elevatedCombos(ruleset, picked)) {
        if (evaluations >= MAX_EVALUATIONS) break;
        if (budget.validations >= budget.limit) break;
        const slots = assignSlots(
          { ruleset, variant, picked, elevated },
          strict,
          budget,
        );
        if (!slots) continue;
        evaluations += 1;
        const plan = buildPlan({ ruleset, variant, picked, elevated, slots });
        if (!best || rank(plan) < rank(best)) best = plan;
        if (plan.valid && rank(plan) === 0) return plan;
      }
    }
    if (best?.valid) return best;
  }
  if (best) return best;
  throw new Error(
    `No valid elevated/exam choice found for ${ruleset.id} with ${picked
      .map((entry) => entry.key)
      .join(", ")}`,
  );
}
