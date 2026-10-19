// Short German reasons for forced Block I inclusions (IncludedCourse.mandatoryLabel).

const COUNT_PREFIX =
  /^(je\s+)?(mindestens\s+)?\d+\s+(aufeinanderfolgende\s+)?(Kurshalbjahre|Halbjahresleistungen|Semesterergebnisse|Halbjahre|Halbjahr|Kurse|Kurs|Ergebnisse|Ergebnis)\s+/i;
const ROLE =
  /^(Prüfungsfach|Leistungskurs|Leistungsfach|eA-Fach|Profilfach|Kernfach)\s/;
const LEADING_LOWER =
  /^(Je|Mindestens|Höchstens|Fortgeführte[snr]?|Eine[rs]?|Ein|Zu|Mehr)\s/;

/**
 * Requirement label inside a running list (after "Offen:" or between
 * other items): "Je 4 Kurse …" -> "je 4 Kurse …". Nouns keep their case.
 */
export function inlineRuleLabel(label: string): string {
  return LEADING_LOWER.test(label)
    ? label.charAt(0).toLowerCase() + label.slice(1)
    : label;
}

/**
 * Derives a short reason from a requirement label, e.g.
 * "4 Halbjahre Deutsch" -> "Deutsch",
 * "4 Halbjahre im Prüfungsfach Biologie" -> "Prüfungsfach",
 * "4 Kurse einer fortgeführten Fremdsprache" -> "eine fortgeführte Fremdsprache".
 * Rulesets set `short` or `Pick.label` where this is not good enough.
 */
const cache = new Map<string, string>();

export function shortRuleLabel(label: string): string {
  let hit = cache.get(label);
  if (hit === undefined) {
    hit = derive(label);
    if (cache.size > 2000) cache.clear();
    cache.set(label, hit);
  }
  return hit;
}

function derive(label: string): string {
  let s = label
    .trim()
    .replace(/\.$/, "")
    .replace(/\s*\([^)]*\)/g, "");
  s = s.replace(COUNT_PREFIX, "");
  s = s.replace(/^(im|in|aus dem|aus der|aus|der|des|dem)\s+/i, "");
  const role = ROLE.exec(s);
  if (role) return role[1];
  s = s
    .replace(/^einer\s+(\S+)en\s+/, (_m, adj: string) => `eine ${adj}e `)
    .replace(/^einer\s+/, "eine ")
    .replace(/^eines\s+/, "ein ");
  return s.trim();
}
