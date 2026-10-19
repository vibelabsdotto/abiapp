// Live preview for the exam editor: evaluate() with the edited exam result
// (or extra) swapped into the current EngineInput.

import { evaluate } from "@domain/index";
import type { AbiturEvaluation, EngineInput, ExamSlot } from "@domain/model";

export type ExamTarget =
  | { kind: "slot"; slot: ExamSlot; extraId: null }
  | { kind: "extra"; slot: ExamSlot | null; extraId: string };

export function withExamValue(
  input: EngineInput,
  target: ExamTarget,
  main: number | null,
  oral: number | null,
): EngineInput {
  if (target.kind === "extra") {
    return { ...input, extras: { ...input.extras, [target.extraId]: main } };
  }
  const exams = input.exams.filter((exam) => exam.slot !== target.slot);
  if (main !== null || oral !== null) {
    exams.push({ slot: target.slot, mainPoints: main, oralPoints: oral });
  }
  return { ...input, exams };
}

export function previewEvaluation(
  input: EngineInput,
  target: ExamTarget,
  main: number | null,
  oral: number | null,
): AbiturEvaluation | null {
  try {
    return evaluate(withExamValue(input, target, main, oral));
  } catch {
    return null;
  }
}
