// Sensible default for the exam step: when the ruleset has exactly as many
// exam slots that require the elevated level as the user has elevated
// subjects (SN: P1 and P2 for the two Leistungskurse), those slots can only
// be filled one way up to the order. Pure function.

import type { ExamComponentInfo, ExamSlot } from "@domain/model";

export function elevatedSlotDefaults(
  components: readonly ExamComponentInfo[],
  subjects: readonly { id: string; level: string }[],
): Partial<Record<ExamSlot, string>> {
  const slots = components.filter(
    (component) => component.level === "elevated",
  );
  const elevated = subjects.filter((subject) => subject.level === "elevated");
  if (slots.length === 0 || slots.length !== elevated.length) return {};
  const result: Partial<Record<ExamSlot, string>> = {};
  slots.forEach((component, index) => {
    result[component.slot] = elevated[index].id;
  });
  return result;
}
