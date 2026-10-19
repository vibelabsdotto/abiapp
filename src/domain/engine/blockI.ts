// Block I: course inclusion with exact optimization.
//
// For one configuration (weighting, one option per requirement, extra
// variant, relaxation, implication choice) the optimal selection is:
// forced courses (manual, picks as best-k per subject, group minimums with
// the best group courses) plus the best remaining courses per weight class.
// Within a subject all courses share one weight, so taking the best k of a
// subject dominates any other k courses in both sum and deficit count. The
// engine enumerates all configurations and all admissible counts (N within
// the range, every split over weight classes) and keeps the selection that
// is admissible and maximizes E_I (ties: fewer deficits, higher exact P/S,
// fewer courses). Verified against brute force on random cases (scratch).

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
  Relaxation,
  Requirement,
  RequirementOption,
  RuleContext,
  WeightingOption,
} from "../rulesets/types";
import { courseKey } from "./context";
import { roundHalfUpFrac } from "./math";

const MAX_CONFIGS = 20000;
const MAX_IMPLICATION_BITS = 10;

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
}

export interface BlockIOutcome {
  result: BlockIResult;
  issues: Issue[];
}

const DEFAULT_DEFICIT_THRESHOLD = 5;

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

  const availCount = (
    sid: string,
    hys?: number[],
    withExcluded = false,
  ): number => {
    let n = 0;
    for (const c of base) {
      if (c.subject.id === sid && (!hys || hys.includes(c.halfYear))) n++;
    }
    if (withExcluded) {
      for (const hy of excludedBySubject.get(sid) ?? [])
        if (!hys || hys.includes(hy)) n++;
    }
    return n;
  };
  const groupAvail = (g: GroupMin, withExcluded = false): number =>
    g.subjectIds.reduce(
      (n, sid) => n + availCount(sid, g.halfYears, withExcluded),
      0,
    );
  const relaxations: (Relaxation | null)[] = [
    null,
    ...(rules.relaxations?.(ctx) ?? []),
  ];
  const relaxable = (reqId: string, sid: string): boolean =>
    relaxations.some(
      (r) => !!r && r.subjectId === sid && r.requirementIds.includes(reqId),
    );
  const optionFeasible = (
    req: Requirement,
    o: RequirementOption,
    withExcluded = false,
  ): boolean =>
    o.picks.every(
      (p) =>
        availCount(p.subjectId, p.halfYears, withExcluded) >=
        p.count - (relaxable(req.id, p.subjectId) ? 1 : 0),
    ) &&
    (o.groupMins ?? []).every((g) => groupAvail(g, withExcluded) >= g.count);

  // ---- requirements --------------------------------------------------------
  const requirements = rules.requirements(ctx);
  const unmet: Requirement[] = [];
  const active: { req: Requirement; options: RequirementOption[] }[] = [];
  for (const req of requirements) {
    const feasible = req.options.filter((o) => optionFeasible(req, o));
    if (feasible.length === 0) {
      unmet.push(req);
      const blockedByUser = req.options.some((o) =>
        optionFeasible(req, o, true),
      );
      issues.push({
        code: blockedByUser
          ? "block1.manual.conflict"
          : `block1.requirement.${req.id}`,
        severity: "error",
        message: blockedByUser
          ? `Dein Ausschluss verletzt eine Pflichteinbringung: ${req.label}.`
          : `Pflichteinbringung nicht erfüllbar: ${req.label}.`,
      });
    } else {
      active.push({ req, options: feasible });
    }
  }

  // ---- extras ----------------------------------------------------------------
  const extraChoices: {
    def: BlockIExtraDef;
    variants: (ExtraVariant | null)[];
    predicted: boolean;
  }[] = [];
  const extraViolations: string[] = [];
  for (const def of rules.extras ?? []) {
    const val = def.value(ctx);
    if (!val) {
      if (def.required) extraViolations.push(`${def.label} fehlt`);
      continue;
    }
    const vars: (ExtraVariant | null)[] = def.variants(val.points, ctx);
    if (!def.required) vars.unshift(null);
    extraChoices.push({ def, variants: vars, predicted: val.predicted });
  }

  const weightings = rules.weightings(ctx);
  const implications = rules.implications?.(ctx) ?? [];

  // ---- configuration space -------------------------------------------------
  let optionLists = active.map((a) => a.options);
  const size = () =>
    weightings.length *
    relaxations.length *
    optionLists.reduce((n, l) => n * l.length, 1) *
    extraChoices.reduce((n, e) => n * e.variants.length, 1);
  let approximate = false;
  if (size() > MAX_CONFIGS) {
    approximate = true;
    relaxations.splice(1);
    optionLists = optionLists.map((l) => l.slice(0, 3));
    while (size() > MAX_CONFIGS)
      optionLists = optionLists.map((l) =>
        l.slice(0, Math.max(1, l.length - 1)),
      );
  }

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
    const manualItems = items.filter((i) => i.manual);

    const optIdx = optionLists.map(() => 0);
    const extraIdx = extraChoices.map(() => 0);
    for (;;) {
      for (const relaxation of relaxations) {
        runConfig(
          weighting,
          items,
          bySubject,
          manualItems,
          optIdx,
          extraIdx,
          relaxation,
        );
      }
      // advance odometer
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

  function runConfig(
    weighting: WeightingOption,
    items: BlockItem[],
    bySubject: Map<string, BlockItem[]>,
    manualItems: BlockItem[],
    optIdx: number[],
    extraIdx: number[],
    relaxation: Relaxation | null,
  ): void {
    const selected = new Map<string, Chosen>();
    const countBySubject = new Map<string, number>();
    const violations: string[] = [
      ...extraViolations,
      ...unmet.map((r) => r.label),
    ];
    const add = (item: BlockItem, ruleId: string | null) => {
      selected.set(item.key, { item, ruleId });
      if (item.subjectId)
        countBySubject.set(
          item.subjectId,
          (countBySubject.get(item.subjectId) ?? 0) + 1,
        );
    };
    for (const m of manualItems) add(m, null);

    const extraVariants: Candidate["extraVariants"] = [];
    extraChoices.forEach((e, i) => {
      const variant = e.variants[extraIdx[i]];
      extraVariants.push({ def: e.def, variant });
      if (!variant) return;
      variant.items.forEach((x, j) => {
        add(
          {
            key: `extra:${e.def.id}:${j}`,
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
        );
      });
    });

    const chosenOptions = optionLists.map((l, i) => ({
      req: active[i].req,
      option: l[optIdx[i]],
    }));
    const lower = new Map<
      string,
      { count: number; ruleId: string; label: string }
    >();
    const restricted: {
      subjectId: string;
      count: number;
      halfYears: number[];
      ruleId: string;
      label: string;
    }[] = [];
    const groupMins: GroupMin[] = [];
    const picked = new Set<string>();
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
        if (count > 0) picked.add(p.subjectId);
        if (p.halfYears)
          restricted.push({
            subjectId: p.subjectId,
            count,
            halfYears: p.halfYears,
            ruleId: req.id,
            label: req.label,
          });
        else {
          const cur = lower.get(p.subjectId);
          if (!cur || count > cur.count)
            lower.set(p.subjectId, { count, ruleId: req.id, label: req.label });
        }
      }
      for (const g of option.groupMins ?? []) groupMins.push(g);
    }
    // Implication courses first for subjects that are included anyway.
    const forceImplication = (imp: Implication) => {
      const it = (bySubject.get(imp.subjectId) ?? []).find(
        (x) => x.halfYear === imp.halfYear,
      );
      if (!it) violations.push(imp.label);
      else if (!selected.has(it.key)) add(it, imp.id);
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
        add(it, r.ruleId);
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
        add(it, l.ruleId);
        have++;
      }
      if (have < l.count) violations.push(l.label);
    }

    // Remaining implication subjects: try "included" (course forced) and "not included".
    const free: Implication[] = [];
    for (const imp of implications) {
      if ((countBySubject.get(imp.subjectId) ?? 0) > 0) forceImplication(imp);
      else if (
        bySubject.has(imp.subjectId) &&
        !free.some((f) => f.subjectId === imp.subjectId)
      )
        free.push(imp);
    }
    const freeBits = Math.min(free.length, MAX_IMPLICATION_BITS);
    const masks = 1 << freeBits;
    const baseSelected = new Map(selected);
    const baseCounts = new Map(countBySubject);
    const baseViolations = [...violations];
    for (let mask = 0; mask < masks; mask++) {
      selected.clear();
      for (const [k, v] of baseSelected) selected.set(k, v);
      countBySubject.clear();
      for (const [k, v] of baseCounts) countBySubject.set(k, v);
      violations.length = 0;
      violations.push(...baseViolations);
      const banned = new Set<string>();
      free.forEach((imp, i) => {
        if (i < freeBits && mask & (1 << i)) {
          for (const x of implications)
            if (x.subjectId === imp.subjectId) forceImplication(x);
        } else banned.add(imp.subjectId);
      });
      fill(
        weighting,
        items,
        selected,
        countBySubject,
        violations,
        banned,
        groupMins,
        chosenOptions,
        relaxation,
        extraVariants,
      );
    }
  }

  function fill(
    weighting: WeightingOption,
    items: BlockItem[],
    selected: Map<string, Chosen>,
    countBySubject: Map<string, number>,
    violationsIn: string[],
    banned: Set<string>,
    groupMins: GroupMin[],
    chosenOptions: Candidate["options"],
    relaxation: Relaxation | null,
    extraVariants: Candidate["extraVariants"],
  ): void {
    let slotsM = 0;
    let PM = 0;
    let SM = 0;
    for (const c of selected.values()) {
      slotsM += c.item.slots;
      PM += c.item.wP;
      SM += c.item.wS;
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
    const limitFilters = rules
      .deficitLimits(Math.max(minN, slotsM), SM, ctx)
      .map((l) => l.filter)
      .filter((f): f is (i: BlockItem) => boolean => !!f);
    // Pool partitioned by weight, group membership and deficit-limit filters; best courses first, caps applied.
    const listKey = new Map<string, number>();
    const lists: BlockItem[][] = [];
    const listGroups: number[][] = [];
    const used = new Map<string, number>();
    for (const it of items) {
      const sid = it.subjectId as string;
      if (selected.has(it.key) || banned.has(sid)) continue;
      const cap = caps.get(sid);
      if (cap !== undefined) {
        const u = (countBySubject.get(sid) ?? 0) + (used.get(sid) ?? 0);
        if (u >= cap) continue;
        used.set(sid, (used.get(sid) ?? 0) + 1);
      }
      const gs: number[] = [];
      groupMins.forEach((g, gi) => {
        if (need[gi] > 0 && inGroup(g, it)) gs.push(gi);
      });
      // Separate lists per deficit-limit filter so that limited deficits can be swapped.
      let lim = "";
      limitFilters.forEach((f, li) => {
        if (f(it)) lim += `${li},`;
      });
      const key = `${it.wS}|${gs.join(",")}|${lim}`;
      let li = listKey.get(key);
      if (li === undefined) {
        li = lists.length;
        listKey.set(key, li);
        lists.push([]);
        listGroups.push(gs);
      }
      lists[li].push(it);
    }
    const prefP = lists.map((l) => {
      const a = [0];
      for (const it of l) a.push(a[a.length - 1] + it.wP);
      return a;
    });
    const prefS = lists.map((l) => {
      const a = [0];
      for (const it of l) a.push(a[a.length - 1] + it.wS);
      return a;
    });
    const poolSize = lists.reduce((n, l) => n + l.length, 0);
    const violationsBase = [...violationsIn];
    let nFrom = Math.max(minN, slotsM);
    let nTo = maxN;
    if (slotsM > maxN) {
      violationsBase.push(
        `Mehr Pflichteinbringungen (${slotsM}) als erlaubt (${maxN})`,
      );
      nFrom = nTo = slotsM;
    } else if (slotsM + poolSize < minN) {
      violationsBase.push(
        `Zu wenige einbringbare Kurse (${slotsM + poolSize} von ${countLabel})`,
      );
      nFrom = nTo = slotsM + poolSize;
    } else {
      nTo = Math.min(maxN, slotsM + poolSize);
    }

    const split = new Array<number>(lists.length).fill(0);
    let curN = 0;
    const enumerate = (ci: number, rest: number): void => {
      if (lists.length === 0) {
        if (rest === 0) consider(curN);
        return;
      }
      if (ci === lists.length - 1) {
        if (rest > lists[ci].length) return;
        split[ci] = rest;
        consider(curN);
        return;
      }
      const maxHere = Math.min(rest, lists[ci].length);
      for (let a = maxHere; a >= 0; a--) {
        split[ci] = a;
        enumerate(ci + 1, rest - a);
      }
    };
    for (let N = nFrom; N <= nTo; N++) {
      curN = N;
      enumerate(0, N - slotsM);
    }

    function consider(N: number): void {
      let P = PM;
      let S = SM;
      for (let i = 0; i < lists.length; i++) {
        P += prefP[i][split[i]];
        S += prefS[i][split[i]];
      }
      if (S <= 0) return;
      const groupViolations: string[] = [];
      groupMins.forEach((g, gi) => {
        if (need[gi] === 0) return;
        let got = 0;
        for (let i = 0; i < lists.length; i++)
          if (listGroups[i].includes(gi)) got += split[i];
        if (got < need[gi]) groupViolations.push(g.label);
      });
      const E = formula(P, S);
      if (best && best.feasible && (E < best.E || groupViolations.length > 0))
        return;
      const chosen: Chosen[] = [...selected.values()];
      const groupLeft = [...need];
      for (let i = 0; i < lists.length; i++) {
        for (let k = 0; k < split[i]; k++) {
          let ruleId: string | null = null;
          for (const gi of listGroups[i]) {
            if (groupLeft[gi] > 0) {
              groupLeft[gi]--;
              ruleId = groupMins[gi].id;
              break;
            }
          }
          chosen.push({ item: lists[i][k], ruleId });
        }
      }
      let deficits = 0;
      let zeroIncluded = 0;
      const perSubject = new Map<string, number>();
      for (const c of chosen) {
        deficits += c.item.deficits;
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
        for (const c of chosen)
          if (!limit.filter || limit.filter(c.item)) count += c.item.deficits;
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
        deficits,
        violations,
        limitResults,
        chosen,
        weighting,
        options: chosenOptions,
        relaxation,
        extraVariants,
        zeroIncluded,
        feasible: violations.length === 0,
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
      },
      issues,
    };
  }

  const predicted = b.chosen.some((c) => c.item.predicted);
  const included: IncludedCourse[] = b.chosen
    .map((c) => ({
      subjectId: c.item.subjectId ?? `extra:${c.item.extraId}`,
      halfYear: c.item.halfYear,
      points: c.item.points,
      weight: c.item.weight,
      source: c.item.source,
      mandatoryRuleId: c.ruleId,
      manual: c.item.manual,
      extraId: c.item.extraId,
      slots: c.item.slots,
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
  const structural = b.violations.filter(
    (v) =>
      !b.limitResults.some((lr) => lr.limit.label === v) &&
      v !== "Eingebrachter Kurs mit 0 Punkten",
  );
  checks.push({
    id: "block1.mandatory",
    label: `Pflichteinbringungen erfüllt (${countLabel} Kurse)`,
    passed: structural.length === 0,
    detail: structural.length
      ? structural.join("; ")
      : `${b.N} Kurse eingebracht`,
    predicted,
  });
  if (rules.checks) {
    checks.push(
      ...rules.checks(
        ctx,
        {
          items: b.chosen.map((c) => c.item),
          P: b.P,
          S: b.S,
          count: b.N,
          points: b.E,
        },
        predicted,
      ),
    );
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
      countIncluded: b.N,
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
    },
    issues,
  };
}
