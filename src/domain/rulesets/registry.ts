// Registry of all rulesets and the version selection per state and year.

import type { ExamVariantInfo, RulesetSummary, StateCode } from "../model";
import type { Ruleset } from "./types";
import { BB_2027, BB_2028 } from "./BB";
import { BE_2027, BE_2028, BE_2029, BE_2030 } from "./BE";
import { BW_2027, BW_2030 } from "./BW";
import { BY_G9_2027 } from "./BY";
import { HB_2027, HB_2030 } from "./HB";
import { HE_2027, HE_2030 } from "./HE";
import { HH_2027, HH_2030 } from "./HH";
import { MV_2027, MV_2028 } from "./MV";
import { NI_2027, NI_2030 } from "./NI";
import { NW_2027, NW_2030 } from "./NW";
import { RP_2027, RP_2030 } from "./RP";
import { SH_2027, SH_2028 } from "./SH";
import { SL_2027, SL_2030 } from "./SL";
import { SN_2027 } from "./SN";
import { ST_2027 } from "./ST";
import { TH_2027 } from "./TH";

export const STATES: { code: StateCode; name: string }[] = [
  { code: "BW", name: "Baden-Württemberg" },
  { code: "BY", name: "Bayern" },
  { code: "BE", name: "Berlin" },
  { code: "BB", name: "Brandenburg" },
  { code: "HB", name: "Bremen" },
  { code: "HH", name: "Hamburg" },
  { code: "HE", name: "Hessen" },
  { code: "MV", name: "Mecklenburg-Vorpommern" },
  { code: "NI", name: "Niedersachsen" },
  { code: "NW", name: "Nordrhein-Westfalen" },
  { code: "RP", name: "Rheinland-Pfalz" },
  { code: "SL", name: "Saarland" },
  { code: "SN", name: "Sachsen" },
  { code: "ST", name: "Sachsen-Anhalt" },
  { code: "SH", name: "Schleswig-Holstein" },
  { code: "TH", name: "Thüringen" },
];

export const RULESETS: Ruleset[] = [
  BW_2027,
  BW_2030,
  BY_G9_2027,
  BE_2027,
  BE_2028,
  BE_2029,
  BE_2030,
  BB_2027,
  BB_2028,
  HB_2027,
  HB_2030,
  HH_2027,
  HH_2030,
  HE_2027,
  HE_2030,
  MV_2027,
  MV_2028,
  NI_2027,
  NI_2030,
  NW_2027,
  NW_2030,
  RP_2027,
  RP_2030,
  SL_2027,
  SL_2030,
  SN_2027,
  ST_2027,
  SH_2027,
  SH_2028,
  TH_2027,
];

const byId = new Map(RULESETS.map((r) => [r.id, r]));

export function getRuleset(id: string): Ruleset {
  const r = byId.get(id);
  if (!r) throw new Error(`[domain] unknown ruleset ${id}`);
  return r;
}

export function hasRuleset(id: string): boolean {
  return byId.has(id);
}

export function rulesetsOf(state: StateCode): Ruleset[] {
  return RULESETS.filter((r) => r.state === state).sort(
    (a, b) => a.abiturYears.from - b.abiturYears.from,
  );
}

/** Version for the Abitur year; below/above the known range the nearest version. */
export function defaultRulesetOf(state: StateCode, year: number): Ruleset {
  const list = rulesetsOf(state);
  if (list.length === 0) throw new Error(`[domain] no ruleset for ${state}`);
  const hit = list.find(
    (r) =>
      r.abiturYears.from <= year &&
      (r.abiturYears.to === null || year <= r.abiturYears.to),
  );
  if (hit) return hit;
  return year < list[0].abiturYears.from ? list[0] : list[list.length - 1];
}

const summaryCache = new Map<string, RulesetSummary>();

/** Serializable summary (no functions). */
export function toSummary(r: Ruleset): RulesetSummary {
  const cached = summaryCache.get(r.id);
  if (cached) return cached;
  const examVariants: ExamVariantInfo[] = r.blockII.variants.map((v) => ({
    id: v.id,
    label: v.label,
    components: v.components.map((c) => ({
      slot: c.slot,
      kind: c.kind,
      level: c.level,
      factor: c.factor,
      supplementaryOral: c.supplementaryOral,
      label: c.label,
      ...(c.partLabels ? { partLabels: c.partLabels } : {}),
      ...(c.extraId ? { extraId: c.extraId } : {}),
      ...(c.requiresSubject !== undefined
        ? { requiresSubject: c.requiresSubject }
        : {}),
    })),
  }));
  const s: RulesetSummary = {
    id: r.id,
    state: r.state,
    stateName: r.stateName,
    abiturYears: r.abiturYears,
    label: r.label,
    confidence: r.confidence,
    draft: r.draft,
    halfYears: r.halfYears,
    levelNames: r.levelNames,
    elevatedSubjects: r.elevatedSubjects,
    examVariants,
    extraInputs: r.extraInputs,
    catalog: r.catalog,
    defaults: r.defaults,
    summary: r.summary,
    sources: r.sources,
  };
  summaryCache.set(r.id, s);
  return s;
}
