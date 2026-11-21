// Niedersachsen NI-2027 (Abitur 2027–2029), hand-calculated from the
// regulation. Sources:
// - AVO-GOBAK i. d. F. ab 05.03.2025, § 15 Abs. 2, 3, 8; Anlage 1 Nr. 1, 4;
//   Anlage 2 Nr. 1, 2; Anlage 3 (Einbringungsverpflichtungen)
//   https://www.mk.niedersachsen.de/download/110382/AVO-GOBAK_und_EB-AVO-GOBAK_Maerz_2025.pdf
// - VO-GO i. d. F. ab 25.02.2021, § 10 Abs. 2, § 11 Abs. 2–4, 9; Anlagen 2, 3
//   https://www.mk.niedersachsen.de/download/110377/Verordnung_ueber_die_gymnasiale_Oberstufe_und_Ergaenzende_Bestimmungen_Fassungen_Maerz_2025_.pdf
//
// Formulas: E_I = round(40 · P / S), P1 and P2 doubled (Anlage 2 Nr. 1);
// E_II = 4 · (PF1 + … + PF5) (Anlage 2 Nr. 2); written + oral exam
// E = round((8s + 4m) / 3) (Anlage 1 Nr. 1), same for the BLL (Nr. 4).

import { describe, expect, it } from "vitest";

import { evaluate, validateSetup } from "@domain/index";
import {
  build,
  replace,
  check,
  included,
  outcome,
  type Row,
  type Exams,
} from "./build";

// Mathematisch-naturwissenschaftlicher Schwerpunkt (VO-GO § 10 Abs. 2 Nr. 4):
// P1 Mathematik, P2 Physik (Schwerpunktfächer, doppelt), P3 Englisch (eA),
// P4 Deutsch (gA schriftlich), P5 Geschichte (gA mündlich).
const SCIENCE: Row[] = [
  ["ma", [10, 11, 12, 11], { lk: true, slot: "P1" }], // 44
  ["ph", [9, 10, 10, 11], { lk: true, slot: "P2" }], // 40
  ["en", [8, 9, 9, 10], { lk: true, slot: "P3" }], // 36
  ["de", [9, 9, 10, 10], { slot: "P4" }], // 38
  ["ge", [11, 11, 12, 12], { slot: "P5" }], // 46
  ["bio", [12, 12, 13, 13]], // 50, weitere NW (Anlage 3 Fn. 6)
  ["ch", [7, 8, 8, 9]],
  ["ku", [10, 11, null, null]], // 21
  ["pol", [8, 9, null, null]], // 17
  ["rel_ev", [10, 10, 11, 11]], // best 2: 22
  ["sem", [12, 13, 11, null]], // best 2: 25
  ["sp", [13, 13, 14, 14]], // no exam subject: at most 3 (§ 15 Abs. 8)
];
const SCIENCE_EXAMS: Exams = {
  P1: [11],
  P2: [10],
  P3: [9],
  P4: [10],
  P5: [12],
};

describe("NI-2027", () => {
  it("typical case: 36 results, P1 and P2 doubled", () => {
    // Mandatory (32 results, S = 40): Ma 2·44 + Ph 2·40 + En 36 + De 38 +
    // Ge 46 + Bio 50 + Ku 21 + PoWi 17 + Rel 22 + Sem 25 = 423.
    // Free up to 36: Sport 14 + 14 + 13 (cap 3), Sem 11 → P = 475, S = 44.
    // E_I = round(40 · 475 / 44) = round(431.82) = 432
    // (35 results: round(40 · 464 / 43) = 432, same E, lower P/S).
    // E_II = 4 · (11 + 10 + 9 + 10 + 12) = 208. Total 640 → 2,1 (625–642).
    const e = evaluate(build("NI-2027", SCIENCE, SCIENCE_EXAMS));
    expect(outcome(e)).toEqual({
      blockI: 432,
      blockII: 208,
      total: 640,
      grade: 21,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.countIncluded).toBe(36);
    expect(e.blockI.weightSum).toBe(44);
    expect(included(e, "sp")).toHaveLength(3);
    expect(included(e, "bio")).toHaveLength(4);
  });

  it("7 deficits force 35 results although 32 would score more", () => {
    // § 15 Abs. 3 S. 6: 32/33/34 results need 26/27/28 with 5+ (max 6
    // deficits), 35/36 need 28/29 (max 7).
    // 7 mandatory deficits: De 4, 4; Ge 4; Ku 4, 4; PoWi 3, 4.
    // Mandatory P (32 results, S = 40): 88 + 80 + 36 + De 18 + Ge 39 + Bio 50
    // + Ku 8 + PoWi 7 + Rel 22 + Sem 25 = 373 → 373 points, but 7 > 6.
    // Free results are all 6: 35 results: P = 391, S = 43 →
    // round(15640 / 43) = round(363.72) = 364; 36: round(15880 / 44) = 361.
    // E_II 208, total 572 → 2,4 (571–588).
    const rows: Row[] = replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(SCIENCE, "de", [4, 4, 5, 5]),
                "ge",
                [4, 11, 12, 12],
              ),
              "ku",
              [4, 4, null, null],
            ),
            "pol",
            [3, 4, null, null],
          ),
          "sem",
          [12, 13, 6, null],
        ),
        "rel_ev",
        [11, 11, 6, 6],
      ),
      "ch",
      [6, 6, 6, 6],
    ).filter((r) => r[0] !== "sp");
    const e = evaluate(build("NI-2027", rows, SCIENCE_EXAMS));
    expect(outcome(e)).toEqual({
      blockI: 364,
      blockII: 208,
      total: 572,
      grade: 24,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.countIncluded).toBe(35);
    expect(e.blockI.deficits.total).toBe(7);

    // One more mandatory deficit (Ge 13/2 = 4): 8 > 7 → not admitted.
    const worse = replace(rows, "ge", [4, 11, 12, 4]);
    const f = evaluate(build("NI-2027", worse, SCIENCE_EXAMS));
    expect(f.blockI.admitted).toBe(false);
    expect(f.total.passed).toBe(false);
    expect(f.total.gradeTenths).toBeNull();
    expect(check(f, "block1.deficits.total")).toBe(false);
  });

  it("at most 3 deficits in P1 to P3", () => {
    // § 15 Abs. 3 S. 6: at least 9 of the 12 results in P1–P3 with 5+.
    // Ma 4, 11, 12, 11 (38); Ph 4, 10, 10, 11 (35); En 4, 9, 9, 10 (32).
    // P(32) = 76 + 70 + 32 + 38 + 46 + 50 + 21 + 17 + 22 + 25 = 397,
    // 36 results: P = 449, S = 44 → round(17960 / 44) = round(408.18) = 408.
    const rows = replace(
      replace(replace(SCIENCE, "ma", [4, 11, 12, 11]), "ph", [4, 10, 10, 11]),
      "en",
      [4, 9, 9, 10],
    );
    const e = evaluate(build("NI-2027", rows, SCIENCE_EXAMS));
    expect(e.blockI.points).toBe(408);
    expect(e.blockI.admitted).toBe(true);

    const f = evaluate(
      build("NI-2027", replace(rows, "en", [4, 4, 9, 10]), SCIENCE_EXAMS),
    );
    expect(check(f, "block1.deficits.p13")).toBe(false);
    expect(f.blockI.admitted).toBe(false);
  });

  it("fulfils the science duty with the weaker subject and adds the strong results freely", () => {
    // Sprachlicher Schwerpunkt: P1 En, P2 Fr (doubled), P3 Ge, P4 Ma, P5 PoWi.
    // Mandatory without the NW: exams 80 + 80 + 40 + 40 + 40, De 40, Mu 20,
    // Rel 20, Sem 20 = 380 (30 results). One NW with 4 results (Anlage 3).
    // a) NW = Biologie 15, 15, 15, 1 (46): P = 426, 34 results, S = 42 →
    //    round(17040 / 42) = 406; adding 10s only lowers it.
    // b) NW = Chemie 10, 10, 10, 10 (40): P = 420, S = 42, plus Bio 15 + 15
    //    freely → 36 results, P = 450, S = 44 → round(18000 / 44) = 409.
    // E_II = 4 · 50 = 200, total 609 → 2,2 (607–624).
    const rows: Row[] = [
      ["en", [10, 10, 10, 10], { lk: true, slot: "P1" }],
      ["fr", [10, 10, 10, 10], { lk: true, slot: "P2" }],
      ["ge", [10, 10, 10, 10], { lk: true, slot: "P3" }],
      ["ma", [10, 10, 10, 10], { slot: "P4" }],
      ["pol", [10, 10, 10, 10], { slot: "P5" }],
      ["de", [10, 10, 10, 10]],
      ["bio", [15, 15, 15, 1]],
      ["ch", [10, 10, 10, 10]],
      ["mu", [10, 10, null, null]],
      ["rel_ev", [10, 10, null, null]],
      ["sem", [10, 10, 10, null]],
    ];
    const e = evaluate(
      build("NI-2027", rows, {
        P1: [10],
        P2: [10],
        P3: [10],
        P4: [10],
        P5: [10],
      }),
    );
    expect(outcome(e)).toEqual({
      blockI: 409,
      blockII: 200,
      total: 609,
      grade: 22,
      admitted: true,
      passed: true,
    });
    expect(included(e, "ch")).toEqual([0, 1, 2, 3]);
    expect(included(e, "bio")).toHaveLength(2);
  });

  it("gesellschaftswissenschaftlicher Schwerpunkt: no PoWi duty with Erdkunde, 2 results of a further NW", () => {
    // P1 Ge, P2 De (VO-GO § 11 Abs. 3), P3 Erdkunde (2. Schwerpunktfach),
    // P4 En, P5 Bio. Anlage 3 Fn. 9: no PoWi duty; Fn. 8: 2 results of a
    // further FS, NW or Informatik (Ch 7, 7).
    // Mandatory (32): Ge 80 + De 80 + Ek 40 + En 40 + Bio 40 + Ma 32 + Ku 18
    // + Rel 20 + Sem 20 + Ch 14 = 384 → E 384. Adding Sem 10 (33, S = 41):
    // round(15760 / 41) = 384, same E, higher P/S. PoWi 2, 2 stays out.
    // E_II = 200, total 584 → 2,4.
    const rows: Row[] = [
      ["ge", [10, 10, 10, 10], { lk: true, slot: "P1" }],
      ["de", [10, 10, 10, 10], { lk: true, slot: "P2" }],
      ["geo", [10, 10, 10, 10], { lk: true, slot: "P3" }],
      ["en", [10, 10, 10, 10], { slot: "P4" }],
      ["bio", [10, 10, 10, 10], { slot: "P5" }],
      ["ma", [8, 8, 8, 8]],
      ["ku", [9, 9, null, null]],
      ["pol", [2, 2, null, null]],
      ["rel_ev", [10, 10, null, null]],
      ["sem", [10, 10, 10, null]],
      ["ch", [7, 7, 3, 3]],
    ];
    const e = evaluate(
      build("NI-2027", rows, {
        P1: [10],
        P2: [10],
        P3: [10],
        P4: [10],
        P5: [10],
      }),
    );
    expect(outcome(e)).toEqual({
      blockI: 384,
      blockII: 200,
      total: 584,
      grade: 24,
      admitted: true,
      passed: true,
    });
    expect(included(e, "pol")).toEqual([]);
    expect(included(e, "ch")).toEqual([0, 1]);
  });

  it("supplementary oral exam: round((8s + 4m) / 3), three exams with 20+", () => {
    // Anlage 1 Nr. 1: P1 s 3, m 9 → 60 / 3 = 20; P2 s 4, m 6 → 56 / 3 → 19;
    // P3 5 → 20; P4 4 → 16; P5 7 → 28. E_II = 103 (≥ 100), three exams with
    // 20+ (P1, P3, P5). Block I as in the typical case (432): 535 → 2,6.
    const exams = { ...SCIENCE_EXAMS };
    exams.P1 = [3, 9];
    exams.P2 = [4, 6];
    exams.P3 = [5];
    exams.P4 = [4];
    exams.P5 = [7];
    const e = evaluate(build("NI-2027", SCIENCE, exams));
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      20, 19, 20, 16, 28,
    ]);
    expect(outcome(e)).toEqual({
      blockI: 432,
      blockII: 103,
      total: 535,
      grade: 26,
      admitted: true,
      passed: true,
    });

    // P1 s 3, m 8 → 56 / 3 → 19: E_II = 102, but only P3 and P5 reach 20.
    const f = evaluate(build("NI-2027", SCIENCE, { ...exams, P1: [3, 8] }));
    expect(f.blockII.points).toBe(102);
    expect(check(f, "block2.min20")).toBe(false);
    expect(f.total.passed).toBe(false);

    // P5 6 → 24: E_II = 20 + 19 + 20 + 16 + 24 = 99 < 100.
    const g = evaluate(build("NI-2027", SCIENCE, { ...exams, P5: [6] }));
    expect(g.blockII.points).toBe(99);
    expect(check(g, "block2.minPoints")).toBe(false);
  });

  it("Besondere Lernleistung instead of the written P4 exam", () => {
    // VO-GO § 11 Abs. 9; Anlage 1 Nr. 4: Dokumentation 11, Kolloquium 13 →
    // round((88 + 52) / 3) = round(46.67) = 47.
    // E_II = 4 · (11 + 10 + 9 + 12) + 47 = 215, total 432 + 215 = 647 → 2,0.
    const e = evaluate(
      build(
        "NI-2027",
        SCIENCE,
        { ...SCIENCE_EXAMS, P4: [11, 13] },
        { variant: "bll" },
      ),
    );
    expect(e.blockII.components[3].weighted).toBe(47);
    expect(outcome(e)).toEqual({
      blockI: 432,
      blockII: 215,
      total: 647,
      grade: 20,
      admitted: true,
      passed: true,
    });
  });

  it("0 points in a result that must be included blocks the admission", () => {
    // § 15 Abs. 2 S. 2: no included result may have 0 points; Deutsch (P4)
    // needs all four results.
    const e = evaluate(
      build("NI-2027", replace(SCIENCE, "de", [9, 9, 10, 0]), SCIENCE_EXAMS),
    );
    expect(e.blockI.admitted).toBe(false);
    expect(e.total.passed).toBe(false);
  });

  it("a compulsorily new foreign language adds 2 results (Anlage 3 Fn. 2)", () => {
    // Only one continued language (En), Spanisch started in the
    // Einführungsphase: 2 Spanisch results join the mandatory set.
    const rows: Row[] = [...SCIENCE, ["fs_new", [3, 3, 6, 6]]];
    const e = evaluate(build("NI-2027", rows, SCIENCE_EXAMS));
    expect(included(e, "fs_new")).toEqual([2, 3]);
    // Typical case plus Spanisch 6 + 6 instead of the two weakest free
    // results: mandatory 34 (S = 42), P = 423 + 12 = 435, free 14 + 14
    // → P = 463, S = 44 → round(18520 / 44) = round(420.91) = 421.
    expect(e.blockI.points).toBe(421);
  });

  it("a voluntary new language (two continued languages) adds nothing", () => {
    // With Englisch and Französisch continued from Sek I the new language was
    // not compulsory (§ 8 Abs. 2 Nr. 2 c VO-GO), so Fn. 2 does not apply.
    // Fr 8s and the new language stay out: E_I as in the typical case, 432.
    const rows: Row[] = [
      ...SCIENCE,
      ["fr", [8, 8, 8, 8]],
      ["fs_new", [3, 3, 6, 6]],
    ];
    const e = evaluate(build("NI-2027", rows, SCIENCE_EXAMS));
    expect(included(e, "fs_new")).toEqual([]);
    expect(e.blockI.points).toBe(432);
  });

  it("without Religion: two consecutive results of another social subject (Anlage 3 Fn. 5)", () => {
    // Typical case without Religion (−22, 30 mandatory results), Pädagogik
    // 12, 5, 5, 12: the duty needs two consecutive results, best window
    // 12 + 5 = 17 → 32 results, P = 401 + 17 = 418, S = 40. Free: Sport 14,
    // 14, 13 and the other Pädagogik 12 → P = 471, S = 44 →
    // round(18840 / 44) = round(428.18) = 428 (35 results: 427).
    const rows: Row[] = [
      ...SCIENCE.filter((r) => r[0] !== "rel_ev"),
      ["paed", [12, 5, 5, 12]],
    ];
    const e = evaluate(build("NI-2027", rows, SCIENCE_EXAMS));
    expect(e.blockI.points).toBe(428);
    expect(included(e, "paed")).toHaveLength(3);
    expect(e.blockI.assumptions?.some((a) => a.includes("Pädagogik"))).toBe(
      true,
    );
  });

  it("Darstellendes Spiel cannot be P5 next to Kunst as exam subject", () => {
    // VO-GO Anlage 2 Fn. 9.
    const rows: Row[] = [
      ["ku", [10, 10, 10, 10], { lk: true, slot: "P1" }],
      ["de", [10, 10, 10, 10], { lk: true, slot: "P2" }],
      ["en", [10, 10, 10, 10], { lk: true, slot: "P3" }],
      ["ma", [10, 10, 10, 10], { slot: "P4" }],
      ["ds", [10, 10, 10, 10], { slot: "P5" }],
    ];
    const codes = validateSetup(build("NI-2027", rows, {})).map((i) => i.code);
    expect(codes).toContain("exam.dsArts");
  });
});

// NI-2030: Entwurf VO-SEK II-Abitur (Anhörungsfassung 20.08.2026), §§ 24,
// 58, 59, 63, Anlagen 3, 7, 8b:
// https://www.mk.niedersachsen.de/download/231195/Entwurf_EB-VO_SEK_II_Abitur.pdf
// Exactly 32 results, two Leistungsfächer chosen by the student doubled
// (S = 40, so E_I = P), at most 6 deficits, 3 of them in the LF.
const LF2030: Row[] = [
  ["en", [12, 12, 12, 12], { lk: true, slot: "P1" }], // 48 → doubled
  ["bio", [9, 9, 9, 9], { lk: true, slot: "P2" }], // 36, single
  ["ge", [11, 11, 11, 11], { lk: true, slot: "P3" }], // 44 → doubled
  ["de", [10, 10, 10, 10], { slot: "P4" }], // 40
  ["ma", [8, 8, 8, 8], { slot: "P5" }], // 32
  ["ku", [10, 10, null, null]], // 20
  ["pol", [9, 9, null, null]], // 18, further social subject
  ["rel_ev", [10, 10, 11, 11]], // 22
  ["sp", [13, 13, 14, 14]],
  ["ch", [7, 7, 7, 7]],
];
const LF2030_EXAMS: Exams = {
  P1: [12],
  P2: [9],
  P3: [11],
  P4: [10],
  P5: [8],
};

describe("NI-2030 (draft)", () => {
  it("doubles the two best Leistungsfächer, 32 results, E_I = P", () => {
    // § 59 Abs. 2, Anlage 8b Nr. 1: LF En and Ge doubled (better than
    // En + Bio): 96 + 88 + 36 + De 40 + Ma 32 = 292; Ku 20, Rel 22, PoWi 18
    // (Anlage 3) → 26 results, 352. Six free: Sport 14 + 14 + 13, Rel 10 +
    // 10, Ch 7 → P = 420 = E_I. E_II = 4 · 50 = 200, total 620 → 2,2.
    const e = evaluate(build("NI-2030", LF2030, LF2030_EXAMS));
    expect(outcome(e)).toEqual({
      blockI: 420,
      blockII: 200,
      total: 620,
      grade: 22,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.countIncluded).toBe(32);

    // Anlage 7 Nr. 1: P1 s 6, m 10 → round(88 / 3) = 29; E_II = 181,
    // total 601 → 2,3.
    const f = evaluate(
      build("NI-2030", LF2030, { ...LF2030_EXAMS, P1: [6, 10] }),
    );
    expect(f.blockII.points).toBe(181);
    expect(f.total.gradeTenths).toBe(23);
  });

  it("6 deficits are allowed, 7 are not (§ 59 Abs. 3)", () => {
    // Bio (LF) 4, 4, 4, 9 and Ma 4, 4, 4, 8: 6 deficits, 3 in the LF.
    // P = 420 − 15 − 12 = 393.
    const rows = replace(
      replace(LF2030, "bio", [4, 4, 4, 9]),
      "ma",
      [4, 4, 4, 8],
    );
    const e = evaluate(build("NI-2030", rows, LF2030_EXAMS));
    expect(e.blockI.points).toBe(393);
    expect(e.blockI.admitted).toBe(true);
    const f = evaluate(
      build("NI-2030", replace(rows, "ma", [4, 4, 4, 4]), LF2030_EXAMS),
    );
    expect(f.blockI.admitted).toBe(false);
  });
});
