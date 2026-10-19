// Generic setup validation (subject choice, elevated level, exam slots).
// State-specific rules come from Ruleset.validate.

import type { Issue } from "../model";
import type { RuleContext } from "../rulesets/types";

export function validateContext(ctx: RuleContext): Issue[] {
  const r = ctx.ruleset;
  const issues: Issue[] = [];
  const el = r.levelNames.elevated;
  const elevated = ctx.subjects.filter((s) => s.level === "elevated");
  const { min, max } = r.elevatedSubjects;
  if (elevated.length < min || elevated.length > max) {
    const want = min === max ? `genau ${min}` : `${min} bis ${max}`;
    issues.push({
      code: "setup.elevated.count",
      severity: elevated.length > max ? "error" : "warning",
      message: `Du brauchst ${want} ${el.short}-Fächer (${el.name}), gewählt: ${elevated.length}.`,
    });
  }
  const catalog = new Map(r.catalog.map((c) => [c.key, c]));
  for (const s of ctx.subjects) {
    const c = s.catalogKey ? catalog.get(s.catalogKey) : undefined;
    if (c && !c.canBeElevated && s.level === "elevated") {
      issues.push({
        code: "setup.elevated.notAllowed",
        severity: "warning",
        message: `${s.name} kann hier in der Regel nicht als ${el.short} belegt werden.`,
        subjectId: s.id,
      });
    }
    if (c && !c.canBeExam && s.examSlot) {
      issues.push({
        code: "exam.subject.notAllowed",
        severity: "error",
        message: `${s.name} kann kein Prüfungsfach sein.`,
        subjectId: s.id,
        slot: s.examSlot,
      });
    }
  }
  const slots = new Set(ctx.variant.components.map((c) => c.slot));
  for (const s of ctx.subjects) {
    if (s.examSlot && !slots.has(s.examSlot)) {
      issues.push({
        code: "exam.slot.unused",
        severity: "warning",
        message: `${s.examSlot} gibt es in der gewählten Prüfungsvariante nicht (${s.name}).`,
        subjectId: s.id,
        slot: s.examSlot,
      });
    }
  }
  for (const comp of ctx.variant.components) {
    const s = ctx.examSubjectBySlot.get(comp.slot);
    if (!s) continue;
    if (comp.level !== "any" && s.level !== comp.level) {
      const need = r.levelNames[comp.level];
      issues.push({
        code: "exam.slot.level",
        severity: "error",
        message: `${comp.slot} muss ein ${need.short}-Fach sein (${need.name}).`,
        subjectId: s.id,
        slot: comp.slot,
      });
    }
    if (!ctx.isTaken(s.id)) {
      issues.push({
        code: "exam.subject.notTaken",
        severity: "error",
        message: `${s.name} ist als Prüfungsfach gewählt, aber in keinem Halbjahr belegt.`,
        subjectId: s.id,
        slot: comp.slot,
      });
    }
  }
  if (r.validate) issues.push(...r.validate(ctx));
  return issues;
}
