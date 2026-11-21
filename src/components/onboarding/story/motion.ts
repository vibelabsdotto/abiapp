// Motion vocabulary of the story: one curve family for the whole flow and
// a "cue" that every scene element hangs its move on. A scene is one run
// (`play` counts up on start and on every replay); each element starts
// from its first frame and moves to its last after its own delay, on the
// UI thread. Reduce Motion puts every element on its last frame at once.

import { useEffect, useState } from "react";
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/** Ease-out for timing configs. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** The same curve as a function, for worklets that shape a progress. */
export const easeOut = Easing.bezierFn(0.23, 1, 0.32, 1);

/** The answer → label hand-off and every other A → B transform. */
export const TRANSFORM_MS = 504;

export interface Cue {
  /** 0 = not started (first frame), then +1 per run. */
  play: number;
  /** Reduce Motion: last frame, no movement. */
  reduce: boolean;
}

/**
 * settle: critically damped spring, no overshoot (moves, fills).
 * land: a spring with a little life, for things that drop into place.
 * ease: ease-out timing (fades, counters).
 */
export type MoveKind = "settle" | "land" | "ease";

/** Reanimated animation of one move (worklet-free, built on the JS side). */
export const moveTo = (
  to: number,
  kind: MoveKind,
  duration: number,
): number => {
  switch (kind) {
    case "settle":
      return withSpring(to, { duration, dampingRatio: 1 });
    case "land":
      return withSpring(to, { duration, dampingRatio: 0.72 });
    case "ease":
      return withTiming(to, { duration, easing: EASE_OUT });
  }
};

/**
 * A value that sits at `from` until the cue plays, then moves to `to`
 * after `delay` ms.
 */
export function useCue(
  cue: Cue,
  from: number,
  to: number,
  delay: number,
  duration = 600,
  kind: MoveKind = "settle",
): SharedValue<number> {
  const value = useSharedValue(cue.reduce ? to : from);
  const { play, reduce } = cue;
  useEffect(() => {
    cancelAnimation(value);
    if (reduce) {
      value.value = to;
      return;
    }
    value.value = from;
    if (play === 0) return;
    value.value = withDelay(delay, moveTo(to, kind, duration));
  }, [play, reduce, value, from, to, delay, duration, kind]);
  return value;
}

/**
 * A number that counts from `from` to `to` with an ease-out, `delay` ms
 * after the cue plays (JS frames: one short run per scene).
 */
export function useCount(
  cue: Cue,
  from: number,
  to: number,
  delay: number,
  duration: number,
): number {
  const { play, reduce } = cue;
  // The value belongs to one run; a new run starts at `from`.
  const [run, setRun] = useState({ play: -1, value: from });
  useEffect(() => {
    if (reduce || play === 0) return;
    let frame = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      setRun({
        play,
        value: Math.round(from + (to - from) * (1 - (1 - t) ** 3)),
      });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, reduce, from, to, delay, duration]);
  if (reduce) return to;
  return run.play === play ? run.value : from;
}

/** Linear 0..1 of `value` between `start` and `end` (worklet). */
export const span = (value: number, start: number, end: number): number => {
  "worklet";
  if (end <= start) return value >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
};
