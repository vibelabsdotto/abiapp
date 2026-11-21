// Shared pieces of the story scenes: the stage (measures its width, plays
// again on a tap, speaks what it shows), fixed-size text for the drawn
// parts, and timed switches. A scene's geometry is computed from the
// stage width, so the drawn parts never wrap; the text around the stage
// scales with Dynamic Type, the labels inside it stay at their size.

import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { useTranslation } from "@locales/index";

import type { Cue } from "../motion";

export const SceneStage = ({
  height,
  label,
  onReplay,
  children,
}: {
  height: number;
  label: string;
  onReplay: () => void;
  children: (width: number) => React.ReactNode;
}) => {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  return (
    <Pressable
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityHint={t("onboarding.story.replay")}
      onPress={onReplay}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.stage, { height }]}
    >
      {width > 0 ? children(width) : null}
    </Pressable>
  );
};

/** Text inside a drawn scene: fixed size, one line. */
export const StageText = ({
  style,
  children,
  lines = 1,
}: {
  style: StyleProp<TextStyle>;
  children: React.ReactNode;
  lines?: number;
}) => (
  <Text allowFontScaling={false} numberOfLines={lines} style={style}>
    {children}
  </Text>
);

/**
 * False until `delay` ms into the run, then true (Reduce Motion: true).
 * A null delay never switches.
 */
export function useSwitch(cue: Cue, delay: number | null): boolean {
  const { play, reduce } = cue;
  // The run in which the switch fired; a new run starts off.
  const [fired, setFired] = useState(-1);
  useEffect(() => {
    if (delay === null || reduce || play === 0) return;
    const timer = setTimeout(() => setFired(play), delay);
    return () => clearTimeout(timer);
  }, [play, reduce, delay]);
  if (delay === null) return false;
  return reduce || fired === play;
}

/** Deterministic scatter in -0.5..0.5 for index `i` and channel `k`. */
export const scatter = (i: number, k: number): number => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    overflow: "hidden",
  },
});
