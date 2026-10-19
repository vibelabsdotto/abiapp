// Building blocks for ruleset authors: subject lookup, requirement builders,
// common checks and validation helpers. Keep state modules declarative and
// use these helpers instead of re-implementing rules.

import type {
  CourseLevel,
  EngineSubject,
  ExamSlot,
  Issue,
  IssueSeverity,
  RuleCheck,
  SubjectField,
  SubjectTag,
} from "../model";
import type {
  BlockIIContext,
  BlockItem,
  DeficitLimit,
  ExamComponentDef,
  Requirement,
  RequirementOption,
  RuleContext,
  WeightingOption,
} from "./types";
import { roundFrac } from "../engine/math";

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

/** Taken subjects whose catalog key is one of `keys` (in input order). */
export function byKey(ctx: RuleContext, ...keys: string[]): EngineSubject[] {
  return ctx.subjects.filter(
    (s) =>
      s.catalogKey !== null && keys.includes(s.catalogKey) && ctx.isTaken(s.id),
  );
}

/** Taken subjects carrying any of the tags. */
export function byTag(
  ctx: RuleContext,
  ...tags: SubjectTag[]
): EngineSubject[] {
  return ctx.subjects.filter(
    (s) => s.tags.some((t) => tags.includes(t)) && ctx.isTaken(s.id),
  );
}

/** Taken subjects matching a predicate. */
export function taken(
  ctx: RuleContext,
  pred: (s: EngineSubject) => boolean = () => true,
): EngineSubject[] {
  return ctx.subjects.filter((s) => pred(s) && ctx.isTaken(s.id));
}

export const hasKey = (s: EngineSubject, ...keys: string[]): boolean =>
  s.catalogKey !== null && keys.includes(s.catalogKey);

export const hasTag = (s: EngineSubject, ...tags: SubjectTag[]): boolean =>
  s.tags.some((t) => tags.includes(t));

/** Continued foreign languages (not newly started in the Oberstufe). */
export function continuedLanguages(ctx: RuleContext): EngineSubject[] {
  return taken(
    ctx,
    (s) => hasTag(s, "foreign_language") && !hasTag(s, "new_foreign_language"),
  );
}

export function naturalSciences(ctx: RuleContext): EngineSubject[] {
  return taken(ctx, (s) => hasTag(s, "natural_science"));
}

export function examSubjects(ctx: RuleContext): EngineSubject[] {
  const slots = new Set(ctx.variant.components.map((c) => c.slot));
  return ctx.subjects.filter(
    (s) => s.examSlot !== null && slots.has(s.examSlot),
  );
}

export function elevatedSubjects(ctx: RuleContext): EngineSubject[] {
  return ctx.subjects.filter((s) => s.level === "elevated");
}

/** All k-element combinations. */
export function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      acc.push(arr[i]);
      rec(i + 1, acc);
      acc.pop();
    }
  };
  rec(0, []);
  return out;
}

/** Consecutive windows of `size` half-years inside the taken half-years. */
export function consecutiveWindows(
  ctx: RuleContext,
  subjectId: string,
  size: number,
): number[][] {
  const t = ctx.takenHalfYears(subjectId);
  const out: number[][] = [];
  for (const start of t) {
    const w = Array.from({ length: size }, (_, i) => start + i);
    if (w.every((h) => t.includes(h))) out.push(w);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

/** "count half-years of one of the subjects". Count is capped at the taken half-years if `capToTaken`. */
export function oneOf(
  id: string,
  label: string,
  subjects: EngineSubject[],
  count: number | ((s: EngineSubject) => number),
  extra?: Partial<RequirementOption>,
): Requirement {
  return {
    id,
    label,
    options: subjects.map((s) => ({
      label: s.name,
      picks: [
        {
          subjectId: s.id,
          count: typeof count === "function" ? count(s) : count,
        },
      ],
      ...extra,
    })),
  };
}

/** One requirement per subject: `count` half-years of each. */
export function each(
  idPrefix: string,
  label: (s: EngineSubject) => string,
  subjects: EngineSubject[],
  count: number | ((s: EngineSubject) => number),
): Requirement[] {
  return subjects.map((s) => ({
    id: `${idPrefix}.${s.id}`,
    label: label(s),
    options: [
      {
        picks: [
          {
            subjectId: s.id,
            count: typeof count === "function" ? count(s) : count,
          },
        ],
      },
    ],
  }));
}

/** Short reasons for picks of combined requirements (IncludedCourse.mandatoryLabel). */
export const FS_LABEL = "eine Fremdsprache";
export const NW_LABEL = "eine Naturwissenschaft";

/** "zweite Fremdsprache", "zweite Naturwissenschaft" or the subject name (Informatik …). */
export function secondLabel(s: EngineSubject): string {
  if (hasTag(s, "foreign_language")) return "zweite Fremdsprache";
  if (hasTag(s, "natural_science")) return "zweite Naturwissenschaft";
  return s.name;
}

/** All exam subjects of the selected variant with all their half-years. */
export function examSubjectRequirements(
  ctx: RuleContext,
  count = 4,
): Requirement[] {
  return each(
    "exam",
    (s) => `${count} Halbjahre im Prüfungsfach ${s.name}`,
    examSubjects(ctx),
    count,
  ).map((r) => ({ ...r, short: "Prüfungsfach" }));
}

/** At least one included course from every taken subject. */
export function oneFromEachTaken(
  ctx: RuleContext,
  except: (s: EngineSubject) => boolean = () => false,
): Requirement[] {
  return each(
    "eachSubject",
    (s) => `Mindestens 1 Halbjahr ${s.name}`,
    taken(ctx, (s) => !except(s)),
    1,
  ).map((r) => ({ ...r, short: "jedes Fach einmal" }));
}

// ---------------------------------------------------------------------------
// Weighting
// ---------------------------------------------------------------------------

export function levelWeighting(
  elevated: number,
  basic = 1,
  label: string | null = null,
): WeightingOption {
  return {
    id: "level",
    label,
    weight: (s) => (s.level === "elevated" ? elevated : basic),
  };
}

/** One option per pair of doubled elevated subjects (BW, NI-2030 …). */
export function doubledPairs(
  subjects: EngineSubject[],
  labelPrefix: string,
  assumption?: (names: string) => string,
): WeightingOption[] {
  if (subjects.length <= 2) {
    const names = subjects.map((s) => s.name).join(" und ");
    const ids = new Set(subjects.map((s) => s.id));
    return [
      {
        id: "pair",
        label: names ? `${labelPrefix} ${names} doppelt` : null,
        weight: (s) => (ids.has(s.id) ? 2 : 1),
      },
    ];
  }
  return combinations(subjects, 2).map((pair) => {
    const ids = new Set(pair.map((s) => s.id));
    const names = pair.map((s) => s.name).join(" und ");
    return {
      id: `pair:${pair.map((s) => s.id).join("+")}`,
      label: `${labelPrefix} ${names} doppelt`,
      weight: (s: EngineSubject) => (ids.has(s.id) ? 2 : 1),
      assumption: assumption?.(names),
    };
  });
}

// ---------------------------------------------------------------------------
// Deficit limits
// ---------------------------------------------------------------------------

export const isElevatedItem = (i: BlockItem): boolean => i.elevated;
export const isBasicItem = (i: BlockItem): boolean =>
  !i.elevated && i.subjectId !== null;

export function limit(
  id: string,
  max: number,
  label: string,
  filter?: (i: BlockItem) => boolean,
): DeficitLimit {
  return { id, max, label, filter };
}

// ---------------------------------------------------------------------------
// Block II components
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<ExamComponentDef["kind"], string> = {
  written: "schriftlich",
  oral: "mündlich",
  presentation: "Präsentation",
  bll: "Besondere Lernleistung",
};

export function component(
  slot: ExamSlot,
  kind: ExamComponentDef["kind"],
  level: CourseLevel | "any",
  factor: number,
  opts: Partial<ExamComponentDef> & { levelShort?: string } = {},
): ExamComponentDef {
  const { levelShort, ...rest } = opts;
  return {
    slot,
    kind,
    level,
    factor,
    supplementaryOral: kind === "written",
    label: `${slot} · ${KIND_LABEL[kind]}${levelShort ? ` (${levelShort})` : ""}`,
    ...rest,
  };
}

/** Two-part component, weighted mainWeight:oralWeight, times factor, rounded once. */
export function partsCombine(
  factor: number,
  mainWeight: number,
  oralWeight: number,
  rounding: "halfUp" | "floor" = "halfUp",
): ExamComponentDef["combine"] {
  return (main, oral) => {
    const o = oral ?? main;
    const den = mainWeight + oralWeight;
    return {
      combined: (mainWeight * main + oralWeight * o) / den,
      weighted: roundFrac(
        factor * (mainWeight * main + oralWeight * o),
        den,
        rounding,
      ),
    };
  };
}

// ---------------------------------------------------------------------------
// Block II checks
// ---------------------------------------------------------------------------

type Comp = BlockIIContext["components"][number];

export function checkBlockIIMin(
  c: BlockIIContext,
  min = c.ctx.ruleset.blockII.minPoints,
): RuleCheck {
  return {
    id: "block2.minPoints",
    label: `Mindestens ${min} Punkte in Block II`,
    passed: c.points === null ? null : c.points >= min,
    detail:
      c.points === null
        ? null
        : `${c.points} von ${c.ctx.ruleset.blockII.maxPoints}`,
    predicted: c.predicted,
  };
}

/**
 * At least `count` components with `minWeighted` weighted points; among them
 * at least `requireCount` (default 1) satisfying `require`.
 */
export function checkMinComponents(
  c: BlockIIContext,
  opts: {
    id: string;
    label: string;
    count: number;
    minWeighted: number;
    require?: (comp: Comp) => boolean;
    requireCount?: number;
  },
): RuleCheck {
  const known = c.components.filter((x) => x.weighted !== null);
  const ok = known.filter((x) => (x.weighted as number) >= opts.minWeighted);
  const reqOk = opts.require ? ok.filter(opts.require).length : Infinity;
  const passedNow =
    ok.length >= opts.count && reqOk >= (opts.requireCount ?? 1);
  // Components without an assigned subject cannot satisfy `require` yet.
  const unassigned = c.components.some(
    (x) => !x.subject && (x.kind !== "bll" || x.subjectId !== null),
  );
  const allKnown =
    known.length === c.components.length && !(opts.require && unassigned);
  return {
    id: opts.id,
    label: opts.label,
    passed: allKnown ? passedNow : passedNow ? true : null,
    detail: `${ok.length} von ${c.components.length}`,
    predicted: c.predicted,
  };
}

/** No component below `minWeighted` weighted points. */
export function checkNoneBelow(
  c: BlockIIContext,
  minWeighted: number,
  label: string,
  id = "block2.noneBelow",
): RuleCheck {
  const known = c.components.filter((x) => x.weighted !== null);
  const bad = known.filter((x) => (x.weighted as number) < minWeighted);
  return {
    id,
    label,
    passed:
      bad.length > 0
        ? false
        : known.length === c.components.length
          ? true
          : null,
    detail: bad.length ? bad.map((b) => b.slot).join(", ") : null,
    predicted: c.predicted,
  };
}

/** No exam result with 0 points (a supplementary oral above 0 repairs it). */
export function checkNoZeroExam(
  c: BlockIIContext,
  label = "Keine Prüfung mit 0 Punkten",
): RuleCheck {
  const known = c.components.filter((x) => x.mainPoints !== null);
  const bad = known.filter(
    (x) => x.mainPoints === 0 && !(x.oralPoints && x.oralPoints > 0),
  );
  return {
    id: "block2.noZero",
    label,
    passed:
      bad.length > 0
        ? false
        : known.length === c.components.length
          ? true
          : null,
    detail: bad.length ? bad.map((b) => b.slot).join(", ") : null,
    predicted: c.predicted,
  };
}

export const compIsElevated = (x: Comp): boolean =>
  x.subject?.level === "elevated";
export const compIsWritten = (x: Comp): boolean => x.kind === "written";

// ---------------------------------------------------------------------------
// Block I check helpers
// ---------------------------------------------------------------------------

/** Sum of all course values (included or not) of the subjects, null if any unknown. */
export function sumOfCourses(
  ctx: RuleContext,
  subjects: EngineSubject[],
): { sum: number; count: number } {
  let sum = 0;
  let count = 0;
  for (const s of subjects) {
    for (const hy of ctx.takenHalfYears(s.id)) {
      const p = ctx.points(s.id, hy);
      if (p !== null) {
        sum += p;
        count++;
      }
    }
  }
  return { sum, count };
}

export function minSumCheck(
  id: string,
  label: string,
  value: number | null,
  min: number,
  predicted: boolean,
): RuleCheck {
  return {
    id,
    label,
    passed: value === null ? null : value >= min,
    detail: value === null ? null : `${value} (mind. ${min})`,
    predicted,
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function issue(
  code: string,
  severity: IssueSeverity,
  message: string,
  extra: Partial<Pick<Issue, "subjectId" | "halfYear" | "slot">> = {},
): Issue {
  return { code, severity, message, ...extra };
}

/** Error if none of the subjects with these keys is an exam subject. */
export function requireExamSubject(
  ctx: RuleContext,
  keys: string[],
  name: string,
): Issue[] {
  const subs = examSubjects(ctx);
  if (subs.some((s) => hasKey(s, ...keys))) return [];
  const slots = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  // Only an error once every exam slot is assigned; before that a hint.
  return [
    issue(
      `exam.required.${keys[0]}`,
      subs.length >= slots ? "error" : "info",
      `${name} muss Prüfungsfach sein.`,
    ),
  ];
}

/**
 * KMK Ziff. 7.2: at least one elevated subject is German, mathematics, a
 * foreign language or a natural science (checked once all are chosen).
 */
export function requireCoreElevated(ctx: RuleContext): Issue[] {
  const el = elevatedSubjects(ctx);
  if (el.length < ctx.ruleset.elevatedSubjects.min) return [];
  const ok = el.some(
    (s) =>
      hasKey(s, "de", "ma") || hasTag(s, "foreign_language", "natural_science"),
  );
  if (ok) return [];
  const noun = levelNoun(ctx.ruleset.levelNames.elevated);
  return [
    issue(
      "setup.elevated.core",
      "error",
      `Mindestens ein ${noun} muss Deutsch, Mathematik, eine Fremdsprache oder eine Naturwissenschaft sein.`,
    ),
  ];
}

const FIELD_NAMES: Partial<Record<SubjectField, string>> = {
  language: "sprachlich-literarisch-künstlerische",
  social: "gesellschaftswissenschaftliche",
  science: "mathematisch-naturwissenschaftlich-technische",
};

/** All three Aufgabenfelder covered by the exam subjects (only checked when all slots are assigned). */
export function requireFieldsCovered(
  ctx: RuleContext,
  fieldOf: (s: EngineSubject) => SubjectField = (s) => s.field,
): Issue[] {
  const comps = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  );
  const subs = examSubjects(ctx);
  if (subs.length < comps.length) return [];
  const fields = new Set(subs.map(fieldOf));
  const missing = (["language", "social", "science"] as SubjectField[]).filter(
    (f) => !fields.has(f),
  );
  return missing.map((f) =>
    issue(
      `exam.field.${f}`,
      "error",
      `Das ${FIELD_NAMES[f]} Aufgabenfeld fehlt unter den Prüfungsfächern.`,
    ),
  );
}

export function levelName(ctx: RuleContext, level: CourseLevel): string {
  return ctx.ruleset.levelNames[level].short;
}

/**
 * Noun for a level in messages: "Leistungskurs", "Leistungsfach",
 * "Grundkurs" for one-word names, otherwise "eA-Fach" / "gA-Fach".
 */
export function levelNoun(
  n: { name: string; short: string },
  plural = false,
): string {
  const name = n.name.replace(/\s*\(.*\)$/, "");
  if (name.includes(" ")) return `${n.short}-${plural ? "Fächer" : "Fach"}`;
  if (!plural) return name;
  if (name.endsWith("fach")) return `${name.slice(0, -4)}fächer`;
  if (name.endsWith("kurs")) return `${name}e`;
  return name;
}
