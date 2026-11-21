// Spoken point values for VoiceOver/TalkBack: "1 Punkt", "12 Punkte".

import { t } from "@locales/index";

const isOne = (points: number | string) => String(points) === "1";

/** "12 Punkte" / "1 Punkt" (also for a formatted label such as "11,4"). */
export const spokenPoints = (points: number | string): string =>
  t(isOne(points) ? "ui.pointValue" : "ui.pointsValue", { points });

/** "12 Punkte, Note 2+" / "1 Punkt, Note 5−". */
export const spokenPointsWithGrade = (points: number, grade: string): string =>
  t(isOne(points) ? "ui.pointWithGrade" : "ui.pointsWithGrade", {
    points,
    grade,
  });
