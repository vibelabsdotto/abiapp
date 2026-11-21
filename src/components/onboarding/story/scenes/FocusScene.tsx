// Scene "focus": where a point counts. An example grid of subjects x
// half-years; a wave runs over it: the courses that count light up in
// the accent, the weakest fade to "zählt nicht", a counter runs. Then two
// probes, one after the other: +1 in a faded course leaves the Abitur
// points where they are, +1 in a counting course moves them. The scene
// shows points, not the grade: one point rarely changes the grade, and
// the scene must not pretend it does.

import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { PointsBadge, SubjectAvatar } from "@components/ui";
import { NumberType, Radius, Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import { demoSubject } from "../../intro/IntroScreens";
import { useCount, useCue, type Cue } from "../motion";
import { SceneStage, StageText, useSwitch } from "./parts";

const ROWS: { name: string; key: string; cells: [number, boolean][] }[] = [
  {
    name: "german",
    key: "de",
    cells: [
      [12, true],
      [13, true],
      [11, true],
      [12, true],
    ],
  },
  {
    name: "maths",
    key: "ma",
    cells: [
      [10, true],
      [12, true],
      [13, true],
      [11, true],
    ],
  },
  {
    name: "english",
    key: "en",
    cells: [
      [9, true],
      [11, true],
      [8, false],
      [12, true],
    ],
  },
  {
    name: "biology",
    key: "bio",
    cells: [
      [13, true],
      [7, false],
      [12, true],
      [10, true],
    ],
  },
  {
    name: "history",
    key: "ge",
    cells: [
      [6, false],
      [8, false],
      [11, true],
      [9, true],
    ],
  },
];

const TOTAL = ROWS.length * 4;
const COUNTED = ROWS.reduce(
  (sum, row) => sum + row.cells.filter(([, counted]) => counted).length,
  0,
);
/** Example Abitur points; a counting course moves them by one. */
const BEFORE = 612;
const AFTER = 613;
/** The two probes: [row, half-year]. */
const PROBE_PALE: [number, number] = [4, 0];
const PROBE_COUNTED: [number, number] = [1, 0];

const CELL_W = 44;
const ROW_H = 32;
const HEAD_H = 20;
const GRID_H = HEAD_H + ROWS.length * ROW_H;
const PANEL_TOP = GRID_H + 14;
const HEIGHT = PANEL_TOP + 74;

const WAVE_AT = 250;
const WAVE_STAGGER = 38;
const FADE_AT = 900;
const PROBE_1 = 1700;
const PROBE_2 = 2750;
const DROP_MS = 380;

export const FocusScene = ({
  cue,
  onReplay,
}: {
  cue: Cue;
  onReplay: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <SceneStage
      height={HEIGHT}
      label={t("onboarding.story.focus.a11y", {
        count: COUNTED,
        total: TOTAL,
        before: BEFORE,
        after: AFTER,
      })}
      onReplay={onReplay}
    >
      {(width) => <Focus cue={cue} width={width} />}
    </SceneStage>
  );
};

const Focus = ({ cue, width }: { cue: Cue; width: number }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const nameWidth = width - 4 * CELL_W;
  let pale = 0;

  return (
    <>
      <View style={[styles.row, { height: HEAD_H }]}>
        <View style={{ width: nameWidth }}>
          <StageText style={[Type.caption1, { color: colors.textSecondary }]}>
            {t("onboarding.story.example")}
          </StageText>
        </View>
        {[1, 2, 3, 4].map((index) => (
          <View key={index} style={styles.cell}>
            <StageText style={[Type.caption1, { color: colors.textSecondary }]}>
              {t("onboarding.demo.halfYear", { index })}
            </StageText>
          </View>
        ))}
      </View>
      {ROWS.map((row, rowIndex) => (
        <View key={row.name} style={[styles.row, { height: ROW_H }]}>
          <View style={[styles.name, { width: nameWidth }]}>
            <SubjectAvatar {...demoSubject(row.key)} size={24} />
            <StageText style={[Type.subhead, { color: colors.text }]}>
              {t(`onboarding.demo.short.${row.name}`)}
            </StageText>
          </View>
          {row.cells.map(([points, counted], halfYear) => {
            const probe =
              rowIndex === PROBE_PALE[0] && halfYear === PROBE_PALE[1]
                ? PROBE_1
                : rowIndex === PROBE_COUNTED[0] && halfYear === PROBE_COUNTED[1]
                  ? PROBE_2
                  : null;
            return (
              <Cell
                key={halfYear}
                cue={cue}
                points={points}
                counted={counted}
                wave={
                  WAVE_AT + (halfYear * ROWS.length + rowIndex) * WAVE_STAGGER
                }
                fade={counted ? 0 : FADE_AT + pale++ * 110}
                probe={probe}
              />
            );
          })}
        </View>
      ))}
      <Panel cue={cue} />
    </>
  );
};

/** One course: lights up or fades; a probe drops +1 onto it. */
const Cell = ({
  cue,
  points,
  counted,
  wave,
  fade,
  probe,
}: {
  cue: Cue;
  points: number;
  counted: boolean;
  wave: number;
  fade: number;
  probe: number | null;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const lit = useCue(cue, 0, counted ? 1 : 0, wave, 320, "ease");
  const dim = useCue(cue, 1, counted ? 1 : 0.3, fade, 420, "ease");
  const drop = useCue(cue, 0, probe === null ? 0 : 1, probe ?? 0, DROP_MS);
  const bump = useCue(
    cue,
    0,
    probe === null ? 0 : 1,
    (probe ?? 0) + DROP_MS - 40,
    520,
    "land",
  );
  const hit = useSwitch(cue, probe === null ? null : probe + DROP_MS - 40);
  const shown = probe !== null && hit ? points + 1 : points;

  const cellStyle = useAnimatedStyle(() => {
    // A short swell on impact that settles back.
    const swell = Math.sin(Math.min(1, bump.value) * Math.PI) * 0.16;
    return {
      opacity: dim.value,
      transform: [{ scale: 1 + swell }],
    };
  });
  const litStyle = useAnimatedStyle(() => ({ opacity: lit.value }));
  const chipStyle = useAnimatedStyle(() => {
    const p = drop.value;
    return {
      opacity: p <= 0 ? 0 : p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15,
      transform: [{ translateY: -30 + 24 * p }, { scale: 1 - 0.2 * p }],
    };
  });

  return (
    <View style={styles.cell}>
      <Animated.View style={cellStyle}>
        <PointsBadge points={shown} size="small" maxFontScale={1} />
        <Animated.View
          pointerEvents="none"
          style={[styles.lit, { backgroundColor: colors.accent }, litStyle]}
        >
          <StageText
            style={[NumberType.badge, { color: colors.accentForeground }]}
          >
            {shown}
          </StageText>
        </Animated.View>
      </Animated.View>
      {probe !== null ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.chip, { backgroundColor: colors.accent }, chipStyle]}
        >
          <StageText
            style={[NumberType.small, { color: colors.accentForeground }]}
          >
            {t("onboarding.story.focus.plus")}
          </StageText>
        </Animated.View>
      ) : null}
    </View>
  );
};

/** Counter and the Abitur points with the change of the last probe. */
const Panel = ({ cue }: { cue: Cue }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const count = useCount(cue, 0, COUNTED, WAVE_AT, TOTAL * WAVE_STAGGER + 500);
  const first = useSwitch(cue, PROBE_1 + DROP_MS);
  const second = useSwitch(cue, PROBE_2 + DROP_MS);
  const roll = useCue(cue, 0, 1, PROBE_2 + DROP_MS - 40, 460);
  const delta = second ? "+1" : first ? "±0" : "";

  const oldStyle = useAnimatedStyle(() => ({
    opacity: 1 - roll.value,
    transform: [{ translateY: -18 * roll.value }],
  }));
  const newStyle = useAnimatedStyle(() => ({
    opacity: roll.value,
    transform: [{ translateY: 18 * (1 - roll.value) }],
  }));

  return (
    <View
      style={[styles.panel, { top: PANEL_TOP, backgroundColor: colors.card }]}
    >
      <View style={styles.panelText}>
        <StageText lines={2} style={[Type.headline, { color: colors.accent }]}>
          {t("onboarding.story.focus.inclusion", {
            count,
            total: TOTAL,
          })}
        </StageText>
      </View>
      <View style={styles.score}>
        <StageText style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("onboarding.story.focus.total")}
        </StageText>
        <View style={styles.scoreRow}>
          <StageText
            style={[
              Type.subhead,
              styles.delta,
              { color: second ? colors.accent : colors.textSecondary },
            ]}
          >
            {delta}
          </StageText>
          <View style={styles.number}>
            <Animated.View style={oldStyle}>
              <StageText style={[NumberType.title, { color: colors.text }]}>
                {BEFORE}
              </StageText>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, newStyle]}>
              <StageText style={[NumberType.title, { color: colors.text }]}>
                {AFTER}
              </StageText>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cell: {
    width: CELL_W,
    alignItems: "center",
  },
  lit: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.chip,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    position: "absolute",
    top: 0,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 64,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  panelText: {
    flex: 1,
  },
  score: {
    alignItems: "flex-end",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  delta: {
    fontWeight: "600",
  },
  number: {
    alignItems: "flex-end",
  },
});
