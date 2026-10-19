// Block I: course inclusion with exact optimization.
//
// 1. Configurations: weighting option x one option per requirement x extra
//    variant x relaxation. Dominated requirement options (forcing a superset
//    of another option's courses) are pruned exactly; configurations with an
//    identical forced set are evaluated once.
// 2. Forced set per configuration: manual includes, extras, implication
//    courses of included subjects, picks as best-k per subject (restricted
//    half-years first), then the maximum over all picks of a subject.
// 3. Fill: the remaining courses form lists (same weight, same group and
//    deficit-filter membership, best first; subjects with a pending
//    implication get their own list with the required course first). Taking
//    a prefix of each list is optimal, so a small DP over the lists yields
//    the best P for every (count, S, deficits, group progress) state.
// 4. Every admissible count N in the range is scored: admissible first, then
//    E_I, fewer deficits, higher exact P/S, fewer courses.
// 5. Incomplete subject choice (fewer taken courses than the minimum count):
//    the count is open, not violated, and the missing places become one
//    placeholder entry with the rounded average of the included courses.
// Verified against brute force on random cases (scratch probes).

import type {
  BlockIResult,
  EngineSubject,
  IncludedCourse,
  Issue,
  RuleCheck,
} from "../model";
import type {
  BlockIExtraDef,
  BlockItem,
  DeficitLimit,
  ExtraVariant,
  GroupMin,
  Implication,
  Pick,
  Relaxation,
  Requirement,
  RequirementOption,
  RuleContext,
  WeightingOption,
} from "../rulesets/types";
import { listDe } from "../rulesets/helpers";
import { courseKey } from "./context";
import { inlineRuleLabel, shortRuleLabel } from "./labels";
import { roundHalfUpFrac } from "./math";

const MAX_CONFIGS = 20000;

interface BaseCourse {
  key: string;
  subject: EngineSubject;
  halfYear: number;
  points: number;
  source: BlockItem["source"];
  manual: boolean;
}

interface Chosen {
  item: BlockItem;
  ruleId: string | null;
  /** Short reason for IncludedCourse.mandatoryLabel. */
  label: string | null;
}

interface Candidate {
  E: number;
  P: number;
  S: number;
  N: number;
  deficits: number;
  violations: string[];
  limitResults: { limit: DeficitLimit; count: number }[];
  chosen: Chosen[];
  weighting: WeightingOption;
  options: { req: Requirement; option: RequirementOption }[];
  relaxation: Relaxation | null;
  extraVariants: { def: BlockIExtraDef; variant: ExtraVariant | null }[];
  zeroIncluded: number;
  feasible: boolean;
  /** Estimated places for missing subjects (incomplete setup), part of N. */
  pad: number;
}

export interface BlockIOutcome {
  result: BlockIResult;
  issues: Issue[];
}

const DEFAULT_DEFICIT_THRESHOLD = 5;
const PLACEHOLDER_KEY = "placeholder";

/**
 * Estimate for `places` missing Block I places: the rounded average per
 * place of the included courses, weight 1, no deficits. Not a real course,
 * so it never counts as a deficit or a course with 0 points.
 */
function placeholderItem(P: number, S: number, places: number): BlockItem {
  const points = Math.min(15, Math.max(0, roundHalfUpFrac(P, S)));
  return {
    key: PLACEHOLDER_KEY,
    subjectId: null,
    extraId: null,
    halfYear: -1,
    points,
    weight: 1,
    slots: places,
    wP: points * places,
    wS: places,
    deficits: 0,
    zero: false,
    elevated: false,
    examSlot: null,
    source: "estimate",
    predicted: true,
    manual: false,
  };
}

function itemFromCourse(c: BaseCourse, w: WeightingOption): BlockItem {
  const weight = w.weight(c.subject, c.halfYear);
  return {
    key: c.key,
    subjectId: c.subject.id,
    extraId: null,
    halfYear: c.halfYear,
    points: c.points,
    weight,
    slots: 1,
    wP: c.points * weight,
    wS: weight,
    deficits: c.points < DEFAULT_DEFICIT_THRESHOLD ? 1 : 0,
    zero: c.points === 0,
    elevated: c.subject.level === "elevated",
    examSlot: c.subject.examSlot,
    source: c.source,
    predicted: c.source !== "official",
    manual: c.manual,
  };
}

function byPointsDesc(a: BlockItem, b: BlockItem): number {
  return (
    b.points - a.points || a.halfYear - b.halfYear || (a.key < b.key ? -1 : 1)
  );
}

interface PickDuty {
  req: Requirement;
  pick: Pick;
  /** Count after a relaxation. */
  count: number;
  short: string;
}

/**
 * Subjects whose forced courses cannot be taken greedily as the best by
 * points: a pick leaves a choice and the subject's courses have different
 * weights, two picks have different half-year windows (nested windows
 * filled in the wrong order or partly overlapping ones force too much), or
 * a sum rule with half-years covers the subject. Their picks become sum
 * rules, which the fill DP solves exactly.
 */
function exactPickSubjects(
  picks: PickDuty[],
  bySubject: Map<string, BlockItem[]>,
  groupMins: GroupMin[],
  mixed: Set<string>,
): Set<string> {
  const out = new Set<string>();
  // Candidates first (cheap): mixed weights, two windows, sum rules with half-years.
  const windowCount = new Map<string, number>();
  const cand = new Set<string>();
  for (const d of picks) {
    if (d.count <= 0) continue;
    const sid = d.pick.subjectId;
    if (mixed.has(sid)) cand.add(sid);
    if (d.pick.halfYears) {
      const n = (windowCount.get(sid) ?? 0) + 1;
      windowCount.set(sid, n);
      if (n > 1) cand.add(sid);
    }
  }
  for (const g of groupMins)
    if (g.halfYears) for (const sid of g.subjectIds) cand.add(sid);
  if (cand.size === 0) return out;
  const bySid = new Map<string, Pick[]>();
  for (const d of picks) {
    if (d.count <= 0 || !cand.has(d.pick.subjectId)) continue;
    const arr = bySid.get(d.pick.subjectId) ?? [];
    arr.push({ ...d.pick, count: d.count });
    bySid.set(d.pick.subjectId, arr);
  }
  for (const [sid, ps] of bySid) {
    const list = bySubject.get(sid) ?? [];
    const inWindow = (hys?: number[]) =>
      list.filter((it) => !hys || hys.includes(it.halfYear)).length;
    if (!ps.some((p) => p.count < inWindow(p.halfYears))) continue;
    const windows = new Set(
      ps.flatMap((p) => (p.halfYears ? [p.halfYears.join(",")] : [])),
    );
    const grouped = groupMins.some(
      (g) => g.halfYears && g.subjectIds.includes(sid),
    );
    if (mixed.has(sid) || windows.size > 1 || grouped) out.add(sid);
  }
  return out;
}

function compare(a: Candidate, b: Candidate): number {
  // > 0 if a is better than b
  if (a.feasible !== b.feasible) return a.feasible ? 1 : -1;
  if (!a.feasible && a.violations.length !== b.violations.length) {
    return b.violations.length - a.violations.length;
  }
  if (a.E !== b.E) return a.E - b.E;
  if (a.deficits !== b.deficits) return b.deficits - a.deficits;
  const r = a.P * b.S - b.P * a.S;
  if (r !== 0) return r;
  return b.N - a.N;
}

export function evaluateBlockI(ctx: RuleContext): BlockIOutcome {
  const rules = ctx.ruleset.blockI;
  const issues: Issue[] = [];
  const countLabel =
    rules.count.min === rules.count.max
      ? `${rules.count.max}`
      : `${rules.count.min}–${rules.count.max}`;

  // ---- available courses -------------------------------------------------
  const courseByKey = new Map(
    ctx.input.courses.map((c) => [courseKey(c.subjectId, c.halfYear), c]),
  );
  const base: BaseCourse[] = [];
  const excludedKeys = new Set<string>();
  for (const s of ctx.subjects) {
    for (const hy of ctx.takenHalfYears(s.id)) {
      const key = courseKey(s.id, hy);
      const v = ctx.values.get(key);
      if (!v || v.points === null) continue;
      const course = courseByKey.get(key);
      const manual = course?.inclusion === "include";
      const includable =
        (rules.zero.includable || v.points > 0) &&
        (!rules.isIncludable || rules.isIncludable(s, hy, ctx));
      if (!includable) {
        if (manual) {
          issues.push({
            code: "block1.manual.notIncludable",
            severity: "warning",
            message: `${s.name} (${ctx.ruleset.halfYears[hy]}) kann nicht eingebracht werden.`,
            subjectId: s.id,
            halfYear: hy,
          });
        }
        continue;
      }
      if (course?.inclusion === "exclude") {
        excludedKeys.add(key);
        continue;
      }
      base.push({
        key,
        subject: s,
        halfYear: hy,
        points: v.points,
        source: v.source,
        manual,
      });
    }
  }
  const excludedBySubject = new Map<string, number[]>();
  for (const k of excludedKeys) {
    const [sid, hy] = [
      k.slice(0, k.lastIndexOf(":")),
      Number(k.slice(k.lastIndexOf(":") + 1)),
    ];
    const arr = excludedBySubject.get(sid) ?? [];
    arr.push(hy);
    excludedBySubject.set(sid, arr);
  }

  const baseHalfYears = new Map<string, number[]>();
  for (const c of base) {
    const arr = baseHalfYears.get(c.subject.id) ?? [];
    arr.push(c.halfYear);
    baseHalfYears.set(c.subject.id, arr);
  }
  const availCount = (
    sid: string,
    hys?: number[],
    withExcluded = false,
  ): number => {
    let n = 0;
    for (const hy of baseHalfYears.get(sid) ?? []) {
      if (!hys || hys.includes(hy)) n++;
    }
    if (withExcluded) {
      for (const hy of excludedBySubject.get(sid) ?? [])
        if (!hys || hys.includes(hy)) n++;
    }
    return n;
  };
  const relaxations: (Relaxation | null)[] = [
    null,
    ...(rules.relaxations?.(ctx) ?? []),
  ];
  const relaxable = (reqId: string, sid: string): boolean =>
    relaxations.some(
      (r) => !!r && r.subjectId === sid && r.requirementIds.includes(reqId),
    );
  /** Taken courses without any value yet (nothing entered anywhere). */
  const pendingCount = (sid: string, hys?: number[]): number => {
    let n = 0;
    for (const hy of ctx.takenHalfYears(sid)) {
      if (hys && !hys.includes(hy)) continue;
      if (ctx.values.get(courseKey(sid, hy))?.points === null) n++;
    }
    return n;
  };
  const optionFeasible = (
    req: Requirement,
    o: RequirementOption,
    withExcluded = false,
    withPending = false,
  ): boolean => {
    const have = (sid: string, hys?: number[]) =>
      availCount(sid, hys, withExcluded) +
      (withPending ? pendingCount(sid, hys) : 0);
    return (
      o.picks.every(
        (p) =>
          have(p.subjectId, p.halfYears) >=
          p.count - (relaxable(req.id, p.subjectId) ? 1 : 0),
      ) &&
      (o.groupMins ?? []).every(
        (g) =>
          g.subjectIds.reduce((n, sid) => n + have(sid, g.halfYears), 0) >=
          g.count,
      )
    );
  };

  // ---- requirements --------------------------------------------------------
  // A requirement nobody can satisfy yet because a subject is missing in the
  // setup or no value is entered is open (check passed = null), not violated.
  const requirements = rules.requirements(ctx);
  const unmet: Requirement[] = [];
  const underTaken: Requirement[] = [];
  const open: string[] = [];
  const active: { req: Requirement; options: RequirementOption[] }[] = [];
  for (const req of requirements) {
    const feasible = req.options.filter((o) => optionFeasible(req, o));
    if (feasible.length > 0) {
      active.push({ req, options: feasible });
      continue;
    }
    const blockedByUser = req.options.some((o) => optionFeasible(req, o, true));
    if (blockedByUser) {
      unmet.push(req);
      issues.push({
        code: "block1.manual.conflict",
        severity: "error",
        message: `Dein Ausschluss verletzt eine Pflichteinbringung: ${req.label}.`,
      });
    } else if (req.options.length === 0) {
      open.push(req.label);
      issues.push({
        code: `block1.requirement.missingSubject`,
        severity: "warning",
        message: `Für diese Pflichteinbringung fehlt noch ein Fach: ${req.label}.`,
      });
    } else if (req.options.some((o) => optionFeasible(req, o, true, true))) {
      open.push(req.label);
    } else {
      // Decided below: open while subjects are still missing, else violated.
      underTaken.push(req);
    }
  }

  // ---- extras ----------------------------------------------------------------
  const extraChoices: {
    def: BlockIExtraDef;
    variants: (ExtraVariant | null)[];
    predicted: boolean;
  }[] = [];
  for (const def of rules.extras ?? []) {
    const val = def.value(ctx);
    if (!val) {
      if (def.required) open.push(def.label);
      continue;
    }
    const vars: (ExtraVariant | null)[] = def.variants(val.points, ctx);
    if (!def.required) vars.unshift(null);
    extraChoices.push({ def, variants: vars, predicted: val.predicted });
  }

  const weightings = rules.weightings(ctx);
  const implications = rules.implications?.(ctx) ?? [];

  // ---- configuration space -------------------------------------------------
  const caps = new Map<string, number>();
  for (const s of ctx.subjects) {
    const cap = rules.maxPerSubject?.(s, ctx);
    if (cap !== null && cap !== undefined) caps.set(s.id, cap);
  }

  let best: Candidate | null = null;
  const minN = rules.count.min;
  const maxN = rules.count.max;
  const formula =
    rules.formula ?? ((P: number, S: number) => roundHalfUpFrac(P * 40, S));
  let approximate = false;

  // ---- incomplete subject choice ---------------------------------------------
  // Places the setup offers at all: every taken course of an includable
  // subject (also excluded ones, 0 points or no value yet), capped per
  // subject, plus the most places an extra can take. Fewer than the minimum
  // count means subjects are still missing. Then the count is open, not
  // violated. Too few places only because of own exclusions or courses with
  // 0 points stays a violation.
  let capacity = 0;
  for (const s of ctx.subjects) {
    let n = 0;
    for (const hy of ctx.takenHalfYears(s.id)) {
      if (!rules.isIncludable || rules.isIncludable(s, hy, ctx)) n++;
    }
    const cap = caps.get(s.id);
    capacity += cap === undefined ? n : Math.min(n, cap);
  }
  for (const e of extraChoices) {
    let most = 0;
    for (const v of e.variants) {
      let slots = 0;
      for (const x of v?.items ?? []) slots += x.slots;
      most = Math.max(most, slots);
    }
    capacity += most;
  }
  const missingPlaces = Math.max(0, minN - capacity);
  // Too little taken for a duty: open while subjects are missing (a new
  // subject can still fill it), a violation once the choice is complete.
  for (const req of underTaken) {
    if (missingPlaces > 0) open.push(req.label);
    else unmet.push(req);
    issues.push({
      code: `block1.requirement.${req.id}`,
      severity: missingPlaces > 0 ? "warning" : "error",
      message: `Zu wenig belegt für die Pflichteinbringung: ${req.label}.`,
    });
  }
  if (missingPlaces > 0) {
    const one = missingPlaces === 1;
    issues.push({
      code: "block1.setup.incomplete",
      severity: "warning",
      message: `Lege noch alle deine Fächer an: Es ${one ? "fehlt" : "fehlen"} mindestens ${missingPlaces} ${one ? "Kurs" : "Kurse"} für Block I.`,
    });
  }

  /**
   * Options of every active requirement without dominated ones. Option A
   * dominates B if A forces nothing B does not force as well (after merging
   * with the fixed single-option duties), so B can never be better. Exact.
   */
  function prunedOptions(relaxation: Relaxation | null): RequirementOption[][] {
    const countOf = (reqId: string, p: Pick) =>
      relaxation &&
      relaxation.subjectId === p.subjectId &&
      relaxation.requirementIds.includes(reqId)
        ? Math.max(0, p.count - 1)
        : p.count;
    const fixed = new Map<string, number>();
    for (const a of active) {
      if (a.options.length !== 1) continue;
      for (const p of a.options[0].picks) {
        if (!p.halfYears) {
          fixed.set(
            p.subjectId,
            Math.max(fixed.get(p.subjectId) ?? 0, countOf(a.req.id, p)),
          );
        }
      }
    }
    return active.map((a) => {
      if (a.options.length <= 1) return a.options;
      const bits = new Map<string, number>();
      const eff = a.options.map((o) => {
        const extra = new Map<string, number>();
        const restricted = new Set<string>();
        for (const p of o.picks) {
          const c = countOf(a.req.id, p);
          if (p.halfYears)
            restricted.add(`${p.subjectId}:${c}:${p.halfYears.join(",")}`);
          else if (c > (fixed.get(p.subjectId) ?? 0)) {
            extra.set(p.subjectId, Math.max(extra.get(p.subjectId) ?? 0, c));
          }
        }
        const groups = new Set(
          (o.groupMins ?? []).map(
            (g) =>
              `${g.subjectIds.join(",")}:${g.count}:${g.halfYears?.join(",") ?? ""}`,
          ),
        );
        // Bit per subject with an extra duty: a quick necessary test for
        // dominance (subjects beyond 30 bits are only checked exactly).
        let mask = 0;
        for (const sid of extra.keys()) {
          let bit = bits.get(sid);
          if (bit === undefined) {
            bit = bits.size;
            bits.set(sid, bit);
          }
          if (bit < 30) mask |= 1 << bit;
        }
        return { o, extra, restricted, groups, mask };
      });
      type Eff = (typeof eff)[number];
      const dominates = (A: Eff, B: Eff): boolean => {
        if ((A.mask & ~B.mask) !== 0) return false;
        for (const [sid, c] of A.extra)
          if ((B.extra.get(sid) ?? fixed.get(sid) ?? 0) < c) return false;
        for (const r of A.restricted) if (!B.restricted.has(r)) return false;
        for (const g of A.groups) if (!B.groups.has(g)) return false;
        return true;
      };
      return eff
        .filter((e, i) => {
          for (let j = 0; j < eff.length; j++) {
            const f = eff[j];
            if (j === i || (f.mask & ~e.mask) !== 0) continue;
            if (dominates(f, e) && (!dominates(e, f) || j < i)) return false;
          }
          return true;
        })
        .map((e) => e.o);
    });
  }

  const prunedCache = new Map<Relaxation | null, RequirementOption[][]>();
  /** Subjects whose courses have different weights in the current weighting. */
  let mixedSubjects = new Set<string>();
  for (const weighting of weightings) {
    const items = base
      .map((c) => itemFromCourse(c, weighting))
      .sort(byPointsDesc);
    const bySubject = new Map<string, BlockItem[]>();
    for (const it of items) {
      const arr = bySubject.get(it.subjectId as string) ?? [];
      arr.push(it);
      bySubject.set(it.subjectId as string, arr);
    }
    mixedSubjects = new Set(
      [...bySubject]
        .filter(([, l]) => l.some((it) => it.wS !== l[0].wS))
        .map(([sid]) => sid),
    );
    const manualItems = items.filter((i) => i.manual);
    const seen = new Set<string>();
    const budget = Math.max(1, Math.floor(MAX_CONFIGS / relaxations.length));
    for (const relaxation of relaxations) {
      let optionLists =
        prunedCache.get(relaxation) ?? prunedOptions(relaxation);
      prunedCache.set(relaxation, optionLists);
      const extraCount = extraChoices.reduce(
        (n, e) => n * e.variants.length,
        1,
      );
      const size = () =>
        optionLists.reduce((n, l) => n * l.length, 1) * extraCount;
      if (size() > budget) {
        approximate = true;
        while (size() > budget && optionLists.some((l) => l.length > 1)) {
          optionLists = optionLists.map((l) =>
            l.slice(0, Math.max(1, l.length - 1)),
          );
        }
      }
      const optIdx = optionLists.map(() => 0);
      const extraIdx = extraChoices.map(() => 0);
      for (;;) {
        runConfig(
          weighting,
          items,
          bySubject,
          manualItems,
          optionLists,
          optIdx,
          extraIdx,
          relaxation,
          seen,
        );
        let pos = 0;
        for (; pos < optIdx.length; pos++) {
          optIdx[pos]++;
          if (optIdx[pos] < optionLists[pos].length) break;
          optIdx[pos] = 0;
        }
        if (pos < optIdx.length) continue;
        let epos = 0;
        for (; epos < extraIdx.length; epos++) {
          extraIdx[epos]++;
          if (extraIdx[epos] < extraChoices[epos].variants.length) break;
          extraIdx[epos] = 0;
        }
        if (epos >= extraIdx.length) break;
      }
    }
  }

  function runConfig(
    weighting: WeightingOption,
    items: BlockItem[],
    bySubject: Map<string, BlockItem[]>,
    manualItems: BlockItem[],
    optionLists: RequirementOption[][],
    optIdx: number[],
    extraIdx: number[],
    relaxation: Relaxation | null,
    seen: Set<string>,
  ): void {
    const selected = new Map<string, Chosen>();
    const countBySubject = new Map<string, number>();
    const violations: string[] = unmet.map((r) => r.label);
    const add = (
      item: BlockItem,
      ruleId: string | null,
      label: string | null = null,
    ) => {
      selected.set(item.key, { item, ruleId, label });
      if (item.subjectId)
        countBySubject.set(
          item.subjectId,
          (countBySubject.get(item.subjectId) ?? 0) + 1,
        );
    };
    for (const m of manualItems) add(m, null, null);

    const extraVariants: Candidate["extraVariants"] = [];
    extraChoices.forEach((e, i) => {
      const variant = e.variants[extraIdx[i]];
      extraVariants.push({ def: e.def, variant });
      if (!variant) return;
      variant.items.forEach((x, j) => {
        add(
          {
            key: `extra:${e.def.id}:${extraIdx[i]}:${j}`,
            subjectId: null,
            extraId: e.def.id,
            halfYear: -1,
            points: x.points,
            weight: x.weight,
            slots: x.slots,
            wP: x.points * x.weight,
            wS: x.slots * x.weight,
            deficits: x.deficits,
            zero: x.points === 0,
            elevated: false,
            examSlot: null,
            source: e.predicted ? "estimate" : "official",
            predicted: e.predicted,
            manual: false,
          },
          e.def.id,
          e.def.short ?? e.def.label,
        );
      });
    });

    const chosenOptions = optionLists.map((l, i) => ({
      req: active[i].req,
      option: l[optIdx[i]],
    }));
    const lower = new Map<
      string,
      { count: number; ruleId: string; label: string; short: string }
    >();
    const restricted: {
      subjectId: string;
      count: number;
      halfYears: number[];
      ruleId: string;
      label: string;
      short: string;
    }[] = [];
    const groupMins: GroupMin[] = [];
    const picks: PickDuty[] = [];
    for (const { req, option } of chosenOptions) {
      for (const p of option.picks) {
        let count = p.count;
        if (
          relaxation &&
          relaxation.subjectId === p.subjectId &&
          relaxation.requirementIds.includes(req.id)
        ) {
          count = Math.max(0, count - 1);
        }
        const short = p.label ?? req.short ?? shortRuleLabel(req.label);
        picks.push({ req, pick: p, count, short });
      }
      for (const g of option.groupMins ?? []) groupMins.push(g);
    }
    const exact = exactPickSubjects(picks, bySubject, groupMins, mixedSubjects);
    const picked = new Set<string>();
    for (const { req, pick: p, count, short } of picks) {
      if (count > 0) picked.add(p.subjectId);
      if (exact.has(p.subjectId)) {
        if (count > 0)
          groupMins.push({
            id: req.id,
            label: req.label,
            subjectIds: [p.subjectId],
            count,
            halfYears: p.halfYears,
            short,
          });
      } else if (p.halfYears)
        restricted.push({
          subjectId: p.subjectId,
          count,
          halfYears: p.halfYears,
          ruleId: req.id,
          label: req.label,
          short,
        });
      else {
        const cur = lower.get(p.subjectId);
        if (!cur || count > cur.count)
          lower.set(p.subjectId, {
            count,
            ruleId: req.id,
            label: req.label,
            short,
          });
      }
    }
    // Implication courses first for subjects that are included anyway.
    const forceImplication = (imp: Implication) => {
      const it = (bySubject.get(imp.subjectId) ?? []).find(
        (x) => x.halfYear === imp.halfYear,
      );
      if (!it) violations.push(imp.label);
      else if (!selected.has(it.key))
        add(it, imp.id, imp.short ?? shortRuleLabel(imp.label));
    };
    for (const imp of implications) {
      if (
        picked.has(imp.subjectId) ||
        (countBySubject.get(imp.subjectId) ?? 0) > 0
      )
        forceImplication(imp);
    }
    for (const r of restricted) {
      const list = bySubject.get(r.subjectId) ?? [];
      let have = 0;
      for (const it of list)
        if (r.halfYears.includes(it.halfYear) && selected.has(it.key)) have++;
      for (const it of list) {
        if (have >= r.count) break;
        if (!r.halfYears.includes(it.halfYear) || selected.has(it.key))
          continue;
        add(it, r.ruleId, r.short);
        have++;
      }
      if (have < r.count) violations.push(r.label);
    }
    for (const [sid, l] of lower) {
      const list = bySubject.get(sid) ?? [];
      let have = countBySubject.get(sid) ?? 0;
      for (const it of list) {
        if (have >= l.count) break;
        if (selected.has(it.key)) continue;
        add(it, l.ruleId, l.short);
        have++;
      }
      if (have < l.count) violations.push(l.label);
    }
    for (const imp of implications) {
      if ((countBySubject.get(imp.subjectId) ?? 0) > 0) forceImplication(imp);
    }
    // Identical forced sets give identical results.
    const sig = `${[...selected.keys()].sort().join(",")}|${groupMins.map((g) => `${g.id}:${g.subjectIds.join("+")}:${g.count}:${g.halfYears?.join("+") ?? ""}`).join(",")}|${violations.join(";")}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    fill(
      weighting,
      items,
      selected,
      countBySubject,
      violations,
      groupMins,
      chosenOptions,
      relaxation,
      extraVariants,
    );
  }

  /**
   * Whether a configuration with this forced set can still produce a
   * candidate strictly better than `b` (compare: E, deficits, P/S, N). Uses
   * optimistic bounds: the remaining courses split into weight units, the
   * best units taken for every possible weight sum; caps, groups,
   * implications and deficit limits are dropped. A configuration that can
   * at best tie loses anyway (the first candidate wins ties), so skipping it
   * keeps the result exact.
   */
  function canBeat(
    b: Candidate,
    items: BlockItem[],
    selected: Map<string, Chosen>,
    slotsM: number,
    PM: number,
    SM: number,
    defTM: number,
  ): boolean {
    const kMin = Math.max(0, minN - slotsM);
    const kMax = Math.max(0, maxN - slotsM);
    let wMin = Infinity;
    let wMax = 0;
    let clean = 0;
    const units: number[] = [];
    for (const it of items) {
      if (selected.has(it.key)) continue;
      if (!Number.isInteger(it.wS) || it.wS <= 0) return true;
      wMin = Math.min(wMin, it.wS);
      wMax = Math.max(wMax, it.wS);
      if (it.deficits === 0) clean++;
      for (let u = 0; u < it.wS; u++) units.push(it.points);
    }
    // items are sorted by points, so units are in descending order
    const lo = units.length ? kMin * wMin : 0;
    const hi = Math.min(units.length, kMax * wMax);
    let eUb = -Infinity;
    let rP = 0;
    let rS = 0;
    const consider = (P: number, S: number) => {
      if (S <= 0) return;
      eUb = Math.max(eUb, formula(P, S));
      if (rS === 0 || P * rS > rP * S) {
        rP = P;
        rS = S;
      }
    };
    if (lo === 0) consider(PM, SM);
    let P = PM;
    for (let W = 1; W <= hi; W++) {
      P += units[W - 1];
      if (W >= lo) consider(P, SM + W);
    }
    if (eUb === -Infinity) return true;
    if (eUb !== b.E) return eUb > b.E;
    const defLb = defTM + Math.max(0, kMin - clean);
    if (defLb !== b.deficits) return defLb < b.deficits;
    const r = rP * b.S - b.P * rS;
    if (r !== 0) return r > 0;
    return slotsM + kMin < b.N;
  }

  interface FillList {
    items: BlockItem[];
    /** A list may only be used with 0 or at least minIfAny courses (implication subjects). */
    minIfAny: number;
    /**
     * Explicit choices instead of prefixes (courses that are not alike under
     * a cap or an implication); the first choice is empty.
     */
    subsets?: BlockItem[][];
    /** Most courses a subset choice takes. */
    max?: number;
  }

  function fill(
    weighting: WeightingOption,
    items: BlockItem[],
    selected: Map<string, Chosen>,
    countBySubject: Map<string, number>,
    violationsIn: string[],
    groupMins: GroupMin[],
    chosenOptions: Candidate["options"],
    relaxation: Relaxation | null,
    extraVariants: Candidate["extraVariants"],
  ): void {
    let slotsM = 0;
    let PM = 0;
    let SM = 0;
    let defTM = 0;
    for (const c of selected.values()) {
      slotsM += c.item.slots;
      PM += c.item.wP;
      SM += c.item.wS;
      defTM += c.item.deficits;
    }
    // Branch and bound (exact): once a feasible selection exists, skip
    // configurations that are infeasible anyway or cannot reach its E.
    if (best && best.feasible) {
      if (violationsIn.length > 0) return;
      if (!canBeat(best, items, selected, slotsM, PM, SM, defTM)) return;
    }
    const inGroup = (g: GroupMin, it: BlockItem) =>
      !!it.subjectId &&
      g.subjectIds.includes(it.subjectId) &&
      (!g.halfYears || g.halfYears.includes(it.halfYear));
    const need = groupMins.map((g) => {
      let have = 0;
      for (const c of selected.values()) if (inGroup(g, c.item)) have++;
      return Math.max(0, g.count - have);
    });
    const refLimits = rules.deficitLimits(Math.max(minN, slotsM), SM, ctx);
    const limitDef = (l: DeficitLimit, it: BlockItem) =>
      !l.filter || l.filter(it)
        ? it.deficits * (l.weighted ? it.weight : 1)
        : 0;

    // Free implication subjects form their own list: required courses first.
    const impBySubject = new Map<string, number[]>();
    for (const imp of implications) {
      if ((countBySubject.get(imp.subjectId) ?? 0) > 0) continue;
      const hys = impBySubject.get(imp.subjectId) ?? [];
      hys.push(imp.halfYear);
      impBySubject.set(imp.subjectId, hys);
    }
    // Courses with the same signature are interchangeable except for points.
    const sigOf = (it: BlockItem) => {
      let sig = `${it.wS}|`;
      groupMins.forEach((g, gi) => {
        if (need[gi] > 0 && inGroup(g, it)) sig += `${gi},`;
      });
      sig += "|";
      refLimits.forEach((l, li) => {
        if (l.filter && l.filter(it)) sig += `${li},`;
      });
      return sig;
    };
    const alike = (arr: BlockItem[]) =>
      arr.every((x) => sigOf(x) === sigOf(arr[0]));
    /** The empty choice, then `fixed` plus every subset of `rest` up to `room` items. */
    const subsetsOf = (
      fixed: BlockItem[],
      rest: BlockItem[],
      room: number,
    ): BlockItem[][] => {
      const out: BlockItem[][] = [[]];
      for (let mask = 0; mask < 1 << rest.length; mask++) {
        const sub = [...fixed];
        rest.forEach((x, i) => {
          if (mask & (1 << i)) sub.push(x);
        });
        if (sub.length > 0 && sub.length <= room) out.push(sub);
      }
      return out;
    };
    const lists: FillList[] = [];
    // Capped subjects: the best courses up to the cap if all are alike,
    // otherwise every subset up to the cap is a choice of its own.
    const cappedItems = new Map<string, BlockItem[]>();
    for (const it of items) {
      const sid = it.subjectId as string;
      if (selected.has(it.key) || impBySubject.has(sid) || !caps.has(sid))
        continue;
      const arr = cappedItems.get(sid) ?? [];
      arr.push(it);
      cappedItems.set(sid, arr);
    }
    const skip = new Set<string>();
    for (const [sid, arr] of cappedItems) {
      const room = Math.max(
        0,
        (caps.get(sid) ?? 0) - (countBySubject.get(sid) ?? 0),
      );
      if (arr.length <= room) continue;
      if (alike(arr)) {
        for (const it of arr.slice(room)) skip.add(it.key);
      } else {
        for (const it of arr) skip.add(it.key);
        lists.push({
          items: arr,
          minIfAny: 0,
          max: room,
          subsets: subsetsOf([], arr, room),
        });
      }
    }
    const listKey = new Map<string, number>();
    const impItems = new Map<string, BlockItem[]>();
    for (const it of items) {
      const sid = it.subjectId as string;
      if (selected.has(it.key) || skip.has(it.key)) continue;
      if (impBySubject.has(sid)) {
        const arr = impItems.get(sid) ?? [];
        arr.push(it);
        impItems.set(sid, arr);
        continue;
      }
      const sig = sigOf(it);
      let li = listKey.get(sig);
      if (li === undefined) {
        li = lists.length;
        listKey.set(sig, li);
        lists.push({ items: [], minIfAny: 0 });
      }
      lists[li].items.push(it);
    }
    for (const [sid, hys] of impBySubject) {
      const arr = impItems.get(sid) ?? [];
      const req = arr.filter((x) => hys.includes(x.halfYear));
      if (req.length < new Set(hys).size) continue; // required course unavailable: subject cannot be included
      const cap = caps.get(sid);
      const room =
        cap === undefined ? Infinity : cap - (countBySubject.get(sid) ?? 0);
      if (room < req.length) continue;
      const rest = arr.filter((x) => !hys.includes(x.halfYear));
      if (alike(rest)) {
        const ordered = [...req, ...rest];
        lists.push({
          items: ordered.slice(0, Math.min(ordered.length, room)),
          minIfAny: req.length,
        });
      } else {
        lists.push({
          items: [...req, ...rest],
          minIfAny: req.length,
          max: Math.min(req.length + rest.length, room),
          subsets: subsetsOf(req, rest, room),
        });
      }
    }

    const poolSize = lists.reduce(
      (n, l) => n + (l.subsets ? (l.max ?? 0) : l.items.length),
      0,
    );
    const violationsBase = [...violationsIn];
    let nFrom = Math.max(minN, slotsM);
    let nTo = maxN;
    let pad = 0;
    if (slotsM > maxN) {
      if (!rules.count.extendToMandatory) {
        violationsBase.push(
          `Mehr Pflichteinbringungen (${slotsM}) als erlaubt (${maxN})`,
        );
      }
      nFrom = nTo = slotsM;
    } else if (slotsM + poolSize < minN) {
      // Missing subjects: estimate the rest. Own exclusions: violation.
      if (missingPlaces > 0) pad = minN - slotsM - poolSize;
      else
        violationsBase.push(
          `Zu wenige einbringbare Kurse (${slotsM + poolSize} von ${countLabel})`,
        );
      nFrom = nTo = slotsM + poolSize;
    } else {
      nTo = Math.min(maxN, slotsM + poolSize);
    }
    const fMax = nTo - slotsM;

    // DP over lists (each list used as a prefix): best P per (count, S, deficits, groups).
    interface St {
      t: number;
      P: number;
      S: number;
      defT: number;
      defs: number[];
      zero: number;
      grp: number[];
      pick: number[];
    }
    let states = new Map<string, St>();
    const init: St = {
      t: 0,
      P: 0,
      S: 0,
      defT: 0,
      defs: refLimits.map(() => 0),
      zero: 0,
      grp: need.map(() => 0),
      pick: [],
    };
    states.set("", init);
    const keep = (
      next: Map<string, St>,
      st: St,
      k: number,
      a: Omit<St, "t" | "pick">,
      choice: number,
    ) => {
      const t = st.t + k;
      const key = `${t}|${a.S}|${a.defT}|${a.defs.join(",")}|${a.zero}|${a.grp.join(",")}`;
      const cur = next.get(key);
      if (!cur || a.P > cur.P) {
        next.set(key, {
          t,
          P: a.P,
          S: a.S,
          defT: a.defT,
          defs: [...a.defs],
          zero: a.zero,
          grp: [...a.grp],
          pick: [...st.pick, choice],
        });
      }
    };
    const take = (a: Omit<St, "t" | "pick">, it: BlockItem) => {
      a.P += it.wP;
      a.S += it.wS;
      a.defT += it.deficits;
      refLimits.forEach((l, i) => {
        a.defs[i] += limitDef(l, it);
      });
      if (it.zero) a.zero = 1;
      groupMins.forEach((g, gi) => {
        if (a.grp[gi] < need[gi] && inGroup(g, it)) a.grp[gi]++;
      });
    };
    const start = (st: St) => ({
      P: st.P,
      S: st.S,
      defT: st.defT,
      defs: [...st.defs],
      zero: st.zero,
      grp: [...st.grp],
    });
    for (let li = 0; li < lists.length; li++) {
      const list = lists[li];
      const next = new Map<string, St>();
      for (const st of states.values()) {
        if (list.subsets) {
          list.subsets.forEach((sub, si) => {
            if (st.t + sub.length > fMax) return;
            const a = start(st);
            for (const it of sub) take(a, it);
            keep(next, st, sub.length, a, si);
          });
          continue;
        }
        const a = start(st);
        for (let k = 0; k <= list.items.length && st.t + k <= fMax; k++) {
          if (k > 0) take(a, list.items[k - 1]);
          if (k > 0 && k < list.minIfAny) continue;
          keep(next, st, k, a, k);
        }
      }
      states = next;
    }

    for (const st of states.values()) {
      const N0 = slotsM + st.t;
      if (N0 < nFrom || N0 > nTo) continue;
      let P = PM + st.P;
      let S = SM + st.S;
      if (S <= 0) continue;
      const placeholder = pad > 0 ? placeholderItem(P, S, pad) : null;
      if (placeholder) {
        P += placeholder.wP;
        S += placeholder.wS;
      }
      const N = N0 + pad;
      const groupViolations: string[] = [];
      groupMins.forEach((g, gi) => {
        if (st.grp[gi] < need[gi]) groupViolations.push(g.label);
      });
      const E = formula(P, S);
      if (best && best.feasible && (E < best.E || groupViolations.length > 0))
        continue;
      const chosen: Chosen[] = [...selected.values()];
      const groupLeft = [...need];
      lists.forEach((list, li) => {
        const c = st.pick[li] ?? 0;
        const taken = list.subsets ? list.subsets[c] : list.items.slice(0, c);
        for (const it of taken) {
          let ruleId: string | null = null;
          let label: string | null = null;
          for (let gi = 0; gi < groupMins.length; gi++) {
            const g = groupMins[gi];
            if (groupLeft[gi] > 0 && inGroup(g, it)) {
              groupLeft[gi]--;
              ruleId = g.id;
              label = g.short ?? shortRuleLabel(g.label);
              break;
            }
          }
          chosen.push({ item: it, ruleId, label });
        }
      });
      if (placeholder)
        chosen.push({ item: placeholder, ruleId: null, label: null });
      const perSubject = new Map<string, number>();
      let zeroIncluded = 0;
      for (const c of chosen) {
        if (c.item.zero) zeroIncluded++;
        if (c.item.subjectId)
          perSubject.set(
            c.item.subjectId,
            (perSubject.get(c.item.subjectId) ?? 0) + 1,
          );
      }
      const limits = rules.deficitLimits(N, S, ctx);
      const limitResults = limits.map((limit) => {
        let count = 0;
        for (const c of chosen) count += limitDef(limit, c.item);
        return { limit, count };
      });
      const violations = [...violationsBase, ...groupViolations];
      for (const [sid, n] of perSubject) {
        const cap = caps.get(sid);
        if (cap !== undefined && n > cap) {
          violations.push(
            `Höchstens ${cap} Kurse ${ctx.subjectById.get(sid)?.name ?? sid}`,
          );
        }
      }
      for (const lr of limitResults)
        if (lr.count > lr.limit.max) violations.push(lr.limit.label);
      if (zeroIncluded > 0) violations.push("Eingebrachter Kurs mit 0 Punkten");
      const cand: Candidate = {
        E,
        P,
        S,
        N,
        deficits: defTM + st.defT,
        violations,
        limitResults,
        chosen,
        weighting,
        options: chosenOptions,
        relaxation,
        extraVariants,
        zeroIncluded,
        feasible: violations.length === 0,
        pad,
      };
      if (!best || compare(cand, best) > 0) best = cand;
    }
  }

  // ---- result ----------------------------------------------------------------
  const zeroTakenChecks: RuleCheck[] = [];
  const failIfTaken = rules.zero.failIfTaken;
  if (failIfTaken) {
    const zeros: string[] = [];
    let zeroPredicted = false;
    for (const s of ctx.subjects) {
      if (typeof failIfTaken === "function" && !failIfTaken(s)) continue;
      for (const hy of ctx.takenHalfYears(s.id)) {
        const v = ctx.values.get(courseKey(s.id, hy));
        if (v && v.points === 0) {
          zeros.push(`${s.name} ${ctx.ruleset.halfYears[hy]}`);
          if (v.source !== "official") zeroPredicted = true;
        }
      }
    }
    zeroTakenChecks.push({
      id: "block1.zeroTaken",
      label: "Kein belegter Kurs mit 0 Punkten",
      passed: base.length === 0 ? null : zeros.length === 0,
      detail: zeros.length ? zeros.join(", ") : null,
      predicted: zeroPredicted,
    });
  }

  const b = best as Candidate | null;
  if (!b) {
    return {
      result: {
        points: null,
        maxPoints: rules.maxPoints,
        minPoints: rules.minPoints,
        weightedSum: 0,
        weightSum: 0,
        countIncluded: 0,
        countLabel,
        included: [],
        deficits: { total: 0, elevated: 0, maxTotal: null },
        weightingLabel: null,
        checks: [
          {
            id: "block1.minPoints",
            label: `Mindestens ${rules.minPoints} Punkte in Block I`,
            passed: null,
            detail: null,
            predicted: false,
          },
        ],
        admitted: null,
        predicted: false,
        ...(missingPlaces > 0 ? { missingCourses: missingPlaces } : {}),
      },
      issues,
    };
  }

  const predicted = b.chosen.some((c) => c.item.predicted);
  const included: IncludedCourse[] = b.chosen
    .map((c) => ({
      subjectId:
        c.item.subjectId ??
        (c.item.extraId ? `extra:${c.item.extraId}` : PLACEHOLDER_KEY),
      halfYear: c.item.halfYear,
      points: c.item.points,
      weight: c.item.weight,
      source: c.item.source,
      mandatoryRuleId: c.ruleId,
      mandatoryLabel: c.label,
      manual: c.item.manual,
      extraId: c.item.extraId,
      slots: c.item.slots,
      ...(c.item.key === PLACEHOLDER_KEY ? { placeholder: true } : {}),
    }))
    .sort((x, y) =>
      x.subjectId < y.subjectId
        ? -1
        : x.subjectId > y.subjectId
          ? 1
          : x.halfYear - y.halfYear,
    );

  const checks: RuleCheck[] = [
    {
      id: "block1.minPoints",
      label: `Mindestens ${rules.minPoints} Punkte in Block I`,
      passed: b.E >= rules.minPoints,
      detail: `${b.E} von ${rules.maxPoints}`,
      predicted,
    },
  ];
  for (const lr of b.limitResults) {
    checks.push({
      id: `block1.deficits.${lr.limit.id}`,
      label: lr.limit.label,
      passed: lr.count <= lr.limit.max,
      detail: `${lr.count} von max. ${lr.limit.max}`,
      predicted,
    });
  }
  checks.push({
    id: "block1.zero",
    label: "Kein eingebrachter Kurs mit 0 Punkten",
    passed: b.zeroIncluded === 0,
    detail: b.zeroIncluded ? `${b.zeroIncluded} Kurs(e) mit 0 Punkten` : null,
    predicted,
  });
  checks.push(...zeroTakenChecks);
  const structural = [
    ...new Set(
      b.violations.filter(
        (v) =>
          !b.limitResults.some((lr) => lr.limit.label === v) &&
          v !== "Eingebrachter Kurs mit 0 Punkten",
      ),
    ),
  ];
  const openParts = [
    ...(missingPlaces > 0
      ? [`erst ${capacity} von ${minN} Kursen angelegt`]
      : []),
    ...[...new Set(open)].map(inlineRuleLabel),
  ];
  checks.push({
    id: "block1.mandatory",
    // A condition like the other checks, so "Offen" next to it reads right.
    label: "Alle Pflichteinbringungen, richtige Anzahl",
    passed: structural.length > 0 ? false : openParts.length > 0 ? null : true,
    detail: structural.length
      ? listDe(structural.map((v, i) => (i === 0 ? v : inlineRuleLabel(v))))
      : openParts.length
        ? `Offen: ${listDe(openParts)}`
        : `${b.N} eingebracht (${countLabel} nötig)`,
    predicted,
  });
  if (rules.checks) {
    checks.push(
      ...rules.checks(
        ctx,
        {
          items: b.chosen
            .filter((c) => c.item.key !== PLACEHOLDER_KEY)
            .map((c) => c.item),
          P: b.P,
          S: b.S,
          count: b.N,
          points: b.E,
        },
        predicted,
      ),
    );
  }
  // Incomplete subject choice: whatever depends on the selection is still
  // open. Courses with 0 points and violated duties stay violations.
  if (missingPlaces > 0) {
    for (const c of checks) {
      if (
        c.passed === false &&
        c.id !== "block1.zeroTaken" &&
        c.id !== "block1.mandatory"
      )
        c.passed = null;
    }
  }

  const assumptions: string[] = [];
  if (b.weighting.assumption) assumptions.push(b.weighting.assumption);
  for (const o of b.options)
    if (o.option.assumption) assumptions.push(o.option.assumption);
  if (b.relaxation) assumptions.push(b.relaxation.label);
  if (approximate)
    assumptions.push(
      "Sehr viele Kombinationen: Einbringung nur näherungsweise optimiert.",
    );

  const totalLimit = b.limitResults.find((lr) => lr.limit.id === "total");
  const admitted = checks.some((c) => c.passed === false)
    ? false
    : checks.every((c) => c.passed === true)
      ? true
      : null;

  return {
    result: {
      points: b.E,
      maxPoints: rules.maxPoints,
      minPoints: rules.minPoints,
      weightedSum: b.P,
      weightSum: b.S,
      countIncluded: b.N - b.pad,
      countLabel,
      included,
      deficits: {
        total: b.deficits,
        elevated: b.chosen.reduce(
          (n, c) => n + (c.item.elevated ? c.item.deficits : 0),
          0,
        ),
        maxTotal: totalLimit ? totalLimit.limit.max : null,
      },
      weightingLabel: b.weighting.label,
      checks,
      admitted,
      predicted,
      assumptions,
      ...(missingPlaces > 0 ? { missingCourses: missingPlaces } : {}),
    },
    issues,
  };
}
