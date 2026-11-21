import { describe, expect, it } from "vitest";

import { BASE_CATALOG } from "@domain/rulesets/catalog";
import { SUBJECT_COLOR_KEYS } from "../../components/ui/subjectPalette";
import { defaultSubjectColor } from "../subjectColor";

const subject = (catalogKey: string | null, tags: string[] = []) => ({
  catalogKey,
  tags,
});

describe("defaultSubjectColor", () => {
  it("gibt bekannten Fächern ihre gewohnte Farbe", () => {
    expect(defaultSubjectColor(subject("ma", ["math"]), [])).toBe("blue");
    expect(defaultSubjectColor(subject("bio", ["natural_science"]), [])).toBe(
      "green",
    );
    expect(defaultSubjectColor(subject("de", ["german"]), [])).toBe("pink");
  });

  it("weicht aus, wenn die Wunschfarbe schon vergeben ist", () => {
    // Französisch: violet, dann plum.
    expect(defaultSubjectColor(subject("fr"), ["violet"])).toBe("plum");
    // Beide vergeben: die erste noch freie Farbe der Palette.
    expect(defaultSubjectColor(subject("fr"), ["violet", "plum"])).toBe("ink");
  });

  it("nimmt für unbekannte Schlüssel die Farbe nach Fachgruppe", () => {
    expect(defaultSubjectColor(subject("it", ["foreign_language"]), [])).toBe(
      "violet",
    );
    expect(defaultSubjectColor(subject(null, ["sport"]), [])).toBe("orange");
  });

  it("nimmt ohne Hinweis die am wenigsten genutzte Farbe", () => {
    expect(defaultSubjectColor(subject(null, ["other"]), [])).toBe("ink");
    expect(defaultSubjectColor(subject(null, ["other"]), ["ink", null])).toBe(
      "blue",
    );
    const twiceExceptBrown = SUBJECT_COLOR_KEYS.flatMap((key) =>
      key === "brown" ? [key] : [key, key],
    );
    expect(defaultSubjectColor(subject(null), twiceExceptBrown)).toBe("brown");
  });

  it("hält die Fächer einer typischen Wahl auseinander", () => {
    const keys = [
      "de",
      "ma",
      "en",
      "fr",
      "bio",
      "ch",
      "ph",
      "ge",
      "geo",
      "grw",
      "eth",
      "ku",
    ];
    const used: string[] = [];
    for (const key of keys) {
      const entry = BASE_CATALOG[key];
      expect(entry, key).toBeDefined();
      used.push(
        defaultSubjectColor({ catalogKey: key, tags: entry!.tags }, used),
      );
    }
    // Twelve subjects, twelve palette colours: none twice.
    expect(new Set(used).size).toBe(keys.length);
  });
});
