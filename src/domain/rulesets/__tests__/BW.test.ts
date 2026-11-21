// Baden-Württemberg (BW-2027, BW-2030): hand-computed examples.
//
// Sources:
// - AGVO vom 19.10.2018, zuletzt geändert am 04.02.2025 (GBl. 2025 Nr. 7),
//   §§ 13, 17, 21, 22, 26, 27, Anlagen 1–3,
//   https://www.landesrecht-bw.de/perma?j=GymAbiPrV_BW
// - Kultusministerium BW, Leitfaden für die gymnasiale Oberstufe – Abitur
//   2028 (16.12.2025), Zeugnis-Muster S. 52,
//   https://km.baden-wuerttemberg.de/fileadmin/redaktion/m-km/intern/PDF/Publikationen/Gymnasium/2025-12-16-Leitfaden-ABI-2028.pdf
//
// Every expected value below is computed by hand from the regulation; the
// comments show the way. E_I = round(P · 40 / S) with S = 48 (40 courses, two
// LF doubled), Block II four times each exam.

import { describe, expect, it } from "vitest";

import { evaluate, validateSetup } from "@domain/index";
import {
  build,
  replace,
  check,
  included,
  type Points,
  type Spec,
  type Exams,
} from "./build";

const IDS = ["BW-2027", "BW-2030"];

// ---------------------------------------------------------------------------
// Official example: Zeugnis-Muster, Leitfaden Abitur 2028, S. 52.
// LF Deutsch (L*), Physik (L*), Sport (L); mündlich Mathematik, Geschichte.
// Kurse in Klammern sind nicht angerechnet: Musik 3./4. Hj., LuT 3./4. Hj.
// ---------------------------------------------------------------------------
const MUSTER: Spec[] = [
  { key: "de", lk: true, slot: "P1", p: [11, 9, 11, 10] },
  { key: "en", p: [8, 9, 9, 8] },
  { key: "mu", p: [8, 9, 7, 7] },
  { key: "ge", slot: "P5", p: [11, 9, 10, 12] },
  { key: "pol", p: [9, null, null, 5] },
  { key: "geo", p: [null, 8, 6, null] },
  { key: "rel_ev", p: [9, 9, 10, 10] },
  { key: "ma", slot: "P4", p: [7, 6, 5, 6] },
  { key: "bio", p: [9, 10, 7, 9] },
  { key: "ph", lk: true, slot: "P2", p: [13, 11, 11, 12] },
  { key: "sp", lk: true, slot: "P3", p: [10, 9, 9, 10] },
  { key: "lit", p: [10, 10, 9, 9] },
];
const MUSTER_EXAMS: Exams = {
  P1: [10, 11],
  P2: [11],
  P3: [10],
  P4: [7],
  P5: [10],
};

describe.each(IDS)("%s Zeugnis-Muster (Leitfaden 2028, S. 52)", (id) => {
  const e = evaluate(build(id, MUSTER, MUSTER_EXAMS));

  it("Block I: 40 × 452 / 48 = 376,67 → 377", () => {
    // P = 2·41 (De) + 2·47 (Ph) + 38 (Sp) + 34 (En) + 17 (Mu 8+9)
    //   + 42 (Ge) + 14 (GK 9+5) + 14 (Geo 8+6) + 38 (Rel) + 24 (Ma)
    //   + 35 (Bio) + 20 (LuT 10+10) = 452, S = 48 (40 Kurse, 8 doppelt).
    expect(e.blockI.weightedSum).toBe(452);
    expect(e.blockI.weightSum).toBe(48);
    expect(e.blockI.countIncluded).toBe(40);
    expect(e.blockI.points).toBe(377);
    expect(e.blockI.admitted).toBe(true);
    expect(included(e, "mu")).toEqual([0, 1]);
  });

  it("Block II: 41 + 44 + 40 + 28 + 40 = 193", () => {
    // Deutsch 4 · (2·10 + 11) / 3 = 41,33 → 41 (Anlage 2); Physik 4 · 11 = 44;
    // Sport 4 · 10 = 40; Mathematik 4 · 7 = 28; Geschichte 4 · 10 = 40.
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      41, 44, 40, 28, 40,
    ]);
    expect(e.blockII.points).toBe(193);
    expect(e.blockII.passed).toBe(true);
  });

  it("Gesamt 570 → Note 2,5 (Anlage 3: 570–553)", () => {
    expect(e.total.points).toBe(570);
    expect(e.total.gradeTenths).toBe(25);
    expect(e.total.passed).toBe(true);
  });

  it("has no setup errors", () => {
    const errors = validateSetup(build(id, MUSTER)).filter(
      (i) => i.severity === "error",
    );
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Deficit limits (§ 17 Abs. 1 Satz 3): at most 8 courses below 5 points,
// at most 3 of them in LF. All 40 taken courses are forced (exactly 40).
// LF De, En, Ma; one FS (En), two NW (Bio, Ch) because there is no second FS.
// ---------------------------------------------------------------------------
function deficitCase(ma: Points[], ch: Points[]): Spec[] {
  return [
    { key: "de", lk: true, slot: "P1", p: [10, 10, 10, 10] },
    { key: "en", lk: true, slot: "P2", p: [9, 9, 9, 9] },
    { key: "ma", lk: true, slot: "P3", p: ma },
    { key: "ge", slot: "P5", p: [4, 4, 6, 6] },
    { key: "bio", slot: "P4", p: [3, 4, 6, 6] },
    { key: "ch", p: ch },
    { key: "ku", p: [8, 8, 8, 8] },
    { key: "geo", p: [7, 7, null, null] },
    { key: "pol", p: [null, null, 7, 7] },
    { key: "rel_ev", p: [8, 8, 8, 8] },
    { key: "sp", p: [9, 9, 9, 9] },
  ];
}

describe("BW-2027 deficit limits", () => {
  it("exactly 8 deficits, 3 of them in LF: admitted", () => {
    // Deficits: Ma 4,4,4 (3 LF) + Ge 4,4 + Bio 3,4 + Ch 4 = 8.
    // LF doubled: De (40) and En (36), Ma (18) single: 80 + 72 + 18 = 170.
    // Basic: Ge 20 + Bio 19 + Ch 22 + Ku 32 + Geo 14 + GK 14 + Rel 32
    //   + Sp 36 = 189. P = 359, E_I = 359 · 40 / 48 = 299,17 → 299.
    const e = evaluate(
      build("BW-2027", deficitCase([4, 4, 4, 6], [4, 6, 6, 6])),
    );
    expect(e.blockI.weightedSum).toBe(359);
    expect(e.blockI.points).toBe(299);
    expect(e.blockI.deficits.total).toBe(8);
    expect(e.blockI.deficits.elevated).toBe(3);
    expect(e.blockI.admitted).toBe(true);
  });

  it("one more deficit (9): not admitted", () => {
    // Ch 4,4,6,6: 9 deficits. P = 357, E_I = 357 · 40 / 48 = 297,5 → 298.
    const e = evaluate(
      build("BW-2027", deficitCase([4, 4, 4, 6], [4, 4, 6, 6])),
    );
    expect(e.blockI.points).toBe(298);
    expect(e.blockI.deficits.total).toBe(9);
    expect(check(e, "block1.deficits.total")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
    expect(e.total.passed).toBe(false);
  });

  it("8 deficits but 4 in LF: not admitted", () => {
    // Ma 4,4,4,4 (4 LF) + Ge 2 + Bio 2 = 8 in total, Ch without deficit.
    const e = evaluate(
      build("BW-2027", deficitCase([4, 4, 4, 4], [6, 6, 6, 6])),
    );
    expect(e.blockI.deficits.total).toBe(8);
    expect(e.blockI.deficits.elevated).toBe(4);
    expect(check(e, "block1.deficits.total")).toBe(true);
    expect(check(e, "block1.deficits.elevated")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Best inclusion is not the obvious one: Französisch has the best courses
// (15, 15) but also two deficits. As second FS it would be mandatory with
// all four courses: 7 + 2 = 9 deficits. The second NW (Chemie, 6 each) is
// mandatory instead, and the two 15s of Französisch fill free places.
// ---------------------------------------------------------------------------
const CHOICE: Spec[] = [
  { key: "de", lk: true, slot: "P1", p: [9, 9, 9, 9] },
  { key: "ma", lk: true, slot: "P2", p: [8, 8, 8, 8] },
  { key: "bio", lk: true, slot: "P3", p: [7, 7, 7, 7] },
  { key: "en", slot: "P5", p: [10, 10, 10, 10] },
  { key: "fr", p: [15, 15, 4, 4] },
  { key: "ch", p: [6, 6, 6, 6] },
  { key: "ge", slot: "P4", p: [4, 4, 4, 6] },
  { key: "geo", p: [4, 4, null, null] },
  { key: "pol", p: [null, null, 4, 4] },
  { key: "ku", p: [8, 8, 8, 8] },
  { key: "rel_ev", p: [9, 9, 9, 9] },
  { key: "sp", p: [9, 9, 9, 9] },
];

describe("BW-2027 second NW instead of the stronger second FS", () => {
  const e = evaluate(
    build("BW-2027", CHOICE, {
      P1: [9],
      P2: [8, 12],
      P3: [7],
      P4: [10],
      P5: [11],
    }),
  );

  it("includes Chemie and only the 15s of Französisch", () => {
    // Mandatory (30): LF 12, En 4 (FS, P5), Ch 4 (2nd NW), Ge 4 (P4),
    //   Geo 2, GK 2, Ku 2. Free 10: Fr 15, 15, Rel 9 × 4, Sp 9 × 4.
    // LF: 2 · 36 (De) + 2 · 32 (Ma) + 28 (Bio) = 164.
    // Basic: En 40 + Ch 24 + Ge 18 + Geo 8 + GK 8 + Ku 16 + 102 = 216.
    // P = 380, E_I = 380 · 40 / 48 = 316,67 → 317. Deficits: Ge 3, Geo 2, GK 2.
    expect(included(e, "ch")).toEqual([0, 1, 2, 3]);
    expect(included(e, "fr")).toEqual([0, 1]);
    expect(e.blockI.weightedSum).toBe(380);
    expect(e.blockI.points).toBe(317);
    expect(e.blockI.deficits.total).toBe(7);
    expect(e.blockI.admitted).toBe(true);
  });

  it("additional oral exam in Mathematik: 4 · (2 · 8 + 12) / 3 = 37,33 → 37", () => {
    // Block II: 36 + 37 + 28 + 40 + 44 = 185, total 317 + 185 = 502 → 2,8
    // (Anlage 3: 516–499).
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      36, 37, 28, 40, 44,
    ]);
    expect(e.blockII.points).toBe(185);
    expect(e.total.points).toBe(502);
    expect(e.total.gradeTenths).toBe(28);
    expect(e.total.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 0 points in exams: § 27 Abs. 2 Nr. 3 (no exam below 4 points, four times).
// ---------------------------------------------------------------------------
describe("BW-2027 null-Punkte-Regel in Block II", () => {
  const run = (exams: Exams) =>
    evaluate(build("BW-2027", MUSTER, exams)).blockII;

  it("written 0 + oral 3: 4 · 3 / 3 = 4, passes", () => {
    const b = run({ ...MUSTER_EXAMS, P2: [0, 3] });
    expect(b.components[1].weighted).toBe(4);
    expect(b.checks.find((c) => c.id === "block2.noneBelow")?.passed).toBe(
      true,
    );
    expect(b.passed).toBe(true);
  });

  it("written 0 + oral 2: 4 · 2 / 3 = 2,67 → 3, fails", () => {
    const b = run({ ...MUSTER_EXAMS, P2: [0, 2] });
    expect(b.components[1].weighted).toBe(3);
    expect(b.passed).toBe(false);
  });

  it("oral 0 + Zusatzprüfung 2: 4 · 2 / 2 = 4, passes (§ 26 Abs. 2a)", () => {
    const b = run({ ...MUSTER_EXAMS, P4: [0, 2] });
    expect(b.components[3].weighted).toBe(4);
    // 41 + 44 + 40 + 4 + 40 = 169
    expect(b.points).toBe(169);
    expect(b.passed).toBe(true);
  });

  it("oral 0 + Zusatzprüfung 1: 4 · 1 / 2 = 2, fails", () => {
    const b = run({ ...MUSTER_EXAMS, P4: [0, 1] });
    expect(b.components[3].weighted).toBe(2);
    expect(b.passed).toBe(false);
  });

  it("a Zusatzprüfung only counts after 0 points", () => {
    const b = run({ ...MUSTER_EXAMS, P4: [7, 15] });
    expect(b.components[3].weighted).toBe(28);
  });
});

// ---------------------------------------------------------------------------
// 0 points in Block I: § 17 Abs. 1 Satz 3 (included courses) and § 22 Abs. 2
// Nr. 1 (belegpflichtige courses, included or not).
// ---------------------------------------------------------------------------
describe("BW-2027 null-Punkte-Regel in Block I", () => {
  it("Religionslehre 0 in one half-year (belegpflichtig, not needed): not admitted", () => {
    const e = evaluate(
      build("BW-2027", replace(MUSTER, "rel_ev", [9, 0, 10, 10]), MUSTER_EXAMS),
    );
    expect(check(e, "block1.zeroTaken")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("Musik 3./4. Hj. 0 (belegpflichtig, not included): not admitted", () => {
    const e = evaluate(
      build("BW-2027", replace(MUSTER, "mu", [8, 9, 0, 7]), MUSTER_EXAMS),
    );
    expect(check(e, "block1.zeroTaken")).toBe(false);
  });

  it("0 in a not belegpflichtig course (third FS, Wahlbereich): admitted", () => {
    const e = evaluate(
      build(
        "BW-2027",
        [
          ...MUSTER,
          { key: "es", p: [6, 0, null, null] },
          { key: "fs_new", p: [0, 5, null, null] },
        ],
        MUSTER_EXAMS,
      ),
    );
    expect(check(e, "block1.zeroTaken")).toBe(true);
    expect(e.blockI.points).toBe(377);
    expect(e.blockI.admitted).toBe(true);
  });

  it("Kunst 0 while Musik is complete: admitted (only one of them is belegpflichtig)", () => {
    const e = evaluate(
      build(
        "BW-2027",
        [...MUSTER, { key: "ku", p: [0, 6, 6, 6] }],
        MUSTER_EXAMS,
      ),
    );
    expect(check(e, "block1.zeroTaken")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Besondere Lernleistung (Seminarkurs), § 17 Abs. 1 Satz 4, Abs. 2 letzter Satz.
// ---------------------------------------------------------------------------
describe("BW-2027 Seminarkurs", () => {
  it("in Block I: counts as two courses with its total (12 + 12)", () => {
    // Replaces the two weakest free courses of the Muster (LuT 10, 10 and
    // Rel 9, 9 tie; the weakest free ones are two 9s): P = 452 − 9 − 9 + 24 = 458.
    // E_I = 458 · 40 / 48 = 381,67 → 382.
    const e = evaluate(
      build("BW-2027", MUSTER, MUSTER_EXAMS, {
        extras: { seminar_course: 12 },
      }),
    );
    expect(e.blockI.weightedSum).toBe(458);
    expect(e.blockI.points).toBe(382);
    expect(e.blockI.countIncluded).toBe(40);
  });

  it("in Block II: replaces Geschichte as 5. Prüfungsfach (4 · 13 = 52)", () => {
    // Geschichte is no exam subject any more, Block I unchanged (377).
    // Block II: 41 + 44 + 40 + 28 + 52 = 205, total 582 → 2,4 (588–571).
    const specs = MUSTER.map((s) =>
      s.key === "ge" ? { ...s, slot: undefined } : s,
    );
    const e = evaluate(
      build(
        "BW-2027",
        specs,
        { P1: [10, 11], P2: [11], P3: [10], P4: [7] },
        { variant: "bll", extras: { seminar_course: 13 } },
      ),
    );
    expect(e.blockI.points).toBe(377);
    expect(e.blockII.points).toBe(205);
    expect(e.total.points).toBe(582);
    expect(e.total.gradeTenths).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// Leistungsfach Wirtschaft (§ 13 Abs. 2 Satz 3, § 21 Abs. 2 Nr. 2): only the
// first Geographie and Gemeinschaftskunde course is belegpflichtig; as oral
// exam subject Geographie has three courses (1 + 2 extra), all included.
// ---------------------------------------------------------------------------
describe("BW-2027 Leistungsfach Wirtschaft", () => {
  it("Geographie as oral exam subject with three courses", () => {
    // LF De, Ma, Wi (10 each): any two doubled → 80 + 80 + 40 = 200.
    // Duties: En 36 (FS, P5), Fr 32 + Bio 28 (2 FS + 1 NW), Ku 6+6, Ge 36,
    //   Geo 8+8+8 (P4), GK 7 = 34 courses with LF. Free 6: Sp 12 × 4,
    //   Rel 9, 9 = 66. Basic: 36+32+28+12+36+24+7+66 = 241.
    // P = 441, E_I = 441 · 40 / 48 = 367,5 → 368.
    const ten: Points[] = [10, 10, 10, 10];
    const e = evaluate(
      build("BW-2027", [
        { key: "de", lk: true, slot: "P1", p: ten },
        { key: "ma", lk: true, slot: "P2", p: ten },
        { key: "wi", lk: true, slot: "P3", p: ten },
        { key: "en", slot: "P5", p: [9, 9, 9, 9] },
        { key: "fr", p: [8, 8, 8, 8] },
        { key: "bio", p: [7, 7, 7, 7] },
        { key: "ku", p: [6, 6, 6, 6] },
        { key: "ge", p: [9, 9, 9, 9] },
        { key: "geo", slot: "P4", p: [8, 8, 8, null] },
        { key: "pol", p: [7, null, null, null] },
        { key: "rel_ev", p: [9, 9, 9, 9] },
        { key: "sp", p: [12, 12, 12, 12] },
      ]),
    );
    expect(included(e, "geo")).toEqual([0, 1, 2]);
    expect(included(e, "pol")).toEqual([0]);
    expect(e.blockI.weightedSum).toBe(441);
    expect(e.blockI.points).toBe(368);
    expect(e.blockI.admitted).toBe(true);
  });
});

describe("BW-2027 Informatik as second science (assumption)", () => {
  it("counts only with the Schulversuch note", () => {
    // Muster without Biologie, Informatik 10 × 4 instead: one FS (Englisch),
    // one NW (Physik), Informatik as the second (Leitfaden). P = 452 − 35 + 40
    // = 457, E_I = 457 · 40 / 48 = 380,83 → 381.
    const specs = [
      ...MUSTER.filter((s) => s.key !== "bio"),
      { key: "inf", p: [10, 10, 10, 10] },
    ];
    const e = evaluate(build("BW-2027", specs, MUSTER_EXAMS));
    expect(e.blockI.points).toBe(381);
    expect(e.blockI.assumptions?.some((a) => a.includes("Informatik"))).toBe(
      true,
    );
  });
});
