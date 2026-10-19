// Exact integer helpers. No floating point is used for any value that is
// rounded or compared against a threshold.

/** floor(a / b) for integers, b > 0, exact for |a| < 2^53. */
export function floorDiv(a: number, b: number): number {
  let q = Math.floor(a / b);
  if (q * b > a) q -= 1;
  else if ((q + 1) * b <= a) q += 1;
  return q;
}

/** Round num/den half up (x,5 → x+1) for den > 0. */
export function roundHalfUpFrac(num: number, den: number): number {
  return floorDiv(2 * num + den, 2 * den);
}

export function roundFrac(
  num: number,
  den: number,
  mode: "halfUp" | "floor",
): number {
  return mode === "floor" ? floorDiv(num, den) : roundHalfUpFrac(num, den);
}

/** BigInt variant of round half up, den > 0. */
export function roundHalfUpBig(num: bigint, den: bigint): number {
  // BigInt division truncates toward zero; num >= 0 here.
  return Number((2n * num + den) / (2n * den));
}

/** Grade in tenths from total points, or null below 300. */
export function gradeTenthsFromPoints(total: number): number | null {
  if (!Number.isFinite(total) || total < 300) return null;
  const t = floorDiv(1020 - Math.min(Math.round(total), 900), 18);
  return Math.min(Math.max(t, 10), 40);
}

/** Smallest total that yields a grade of `tenths` or better. */
export function minPointsForTenths(tenths: number): number {
  const t = Math.min(Math.max(Math.round(tenths), 10), 40);
  return Math.max(300, 1003 - 18 * t);
}

/** Average of integers as exact fraction rounded half up; null for empty input. */
export function roundedAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return roundHalfUpFrac(sum, values.length);
}

export function clampPoints(v: number): number {
  return Math.min(15, Math.max(0, Math.round(v)));
}
