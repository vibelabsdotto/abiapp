// Scene "focus": where a point counts. An example grid of subjects x
// half-years; a wave runs over it: the courses that count light up in
// the accent, the weakest fade to "zählt nicht", a counter runs. Then the
// point of the scene, two probes with air between them: a faded course
// lifts, gets +1, and the +1 flies off towards the Abitur points but
// fades on the way (they stay, ±0); a counting course lifts, its +1 lands
// and the points spring from 612 to 613. The scene shows points, not the
// grade: one point rarely changes the grade, and the scene must not
// pretend it does.

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

type Row = { name: string; key: string; cells: [number, boolean][] };

const ROWS: Row[] = [
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
  {
    name: "physics",
    key: "ph",
    cells: [
      [11, true],
      [10, true],
      [12, true],
      [9, true],
    ],
  },
];

/** Example Abitur points; a counting course moves them by one. */
const BEFORE = 612;
const AFTER = 613;

const CELL_W = 56;
const ROW_H = 44;
const HEAD_H = 22;
const PANEL_H = 64;
/** On low screens four subjects, the two probes among them. */
const COMPACT_ROWS = ["german", "maths", "english", "history"];

const WAVE_AT = 250;
const WAVE_STAGGER = 40;
const FADE_AT = 950;
const LIFT_MS = 150;
const FLY_MS = 650;
/** Air between the end of the first probe and the start of the second. */
const AIR_MS = 500;

interface Probe {
  row: number;
  halfYear: number;
  /** The +1 counts (lands on the points) or not (fades on the way). */
  counts: boolean;
  at: number;
}
const PALE_AT = 1750;
const COUNTED_AT = PALE_AT + LIFT_MS + FLY_MS + AIR_MS;
const arrival = (at: number) => at + LIFT_MS + FLY_MS;

/** Rows, counts and positions of the grid, full or compact. */
const geometry = (compact: boolean) => {
  const rows = compact
    ? ROWS.filter((row) => COMPACT_ROWS.includes(row.name))
    : ROWS;
  const gridH = HEAD_H + rows.length * ROW_H;
  const legendTop = gridH + 8;
  const panelTop = legendTop + 30;
  const index = (name: string) => rows.findIndex((row) => row.name === name);
  const probes: Probe[] = [
    { row: index("history"), halfYear: 0, counts: false, at: PALE_AT },
    { row: index("maths"), halfYear: 0, counts: true, at: COUNTED_AT },
  ];
  return {
    rows,
    total: rows.length * 4,
    counted: rows.reduce(
      (sum, row) => sum + row.cells.filter(([, counted]) => counted).length,
      0,
    ),
    legendTop,
    panelTop,
    height: panelTop + PANEL_H,
    probes,
  };
};
type Geometry = ReturnType<typeof geometry>;

export const FocusScene = ({
  cue,
  compact,
  onReplay,
}: {
  cue: Cue;
  compact: boolean;
  onReplay: () => void;
}) => {
  const { t } = useTranslation();
  const g = geometry(compact);
  return (
    <SceneStage
      height={g.height}
      label={t("onboarding.story.focus.a11y", {
        count: g.counted,
        total: g.total,
        before: BEFORE,
        after: AFTER,
      })}
      onReplay={onReplay}
    >
      {(width) => <Focus cue={cue} width={width} g={g} />}
    </SceneStage>
  );
};

const Focus = ({ cue, width, g }: { cue: Cue; width: number; g: Geometry }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const nameWidth = width - 4 * CELL_W;
  // Full subject names where they fit, the short forms on narrow phones.
  const names = nameWidth >= 136 ? "onboarding.demo" : "onboarding.demo.short";
  const cellCentre = (probe: Probe) => ({
    x: nameWidth + probe.halfYear * CELL_W + CELL_W / 2,
    y: HEAD_H + probe.row * ROW_H + ROW_H / 2,
  });
  const scoreCentre = { x: width - 44, y: g.panelTop + 42 };
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
      {g.rows.map((row, rowIndex) => (
        <View key={row.name} style={[styles.row, { height: ROW_H }]}>
          <View style={[styles.name, { width: nameWidth }]}>
            <SubjectAvatar {...demoSubject(row.key)} size={30} />
            <StageText style={[Type.body, styles.flex, { color: colors.text }]}>
              {t(`${names}.${row.name}`)}
            </StageText>
          </View>
          {row.cells.map(([points, counted], halfYear) => (
            <Cell
              key={halfYear}
              cue={cue}
              points={points}
              counted={counted}
              wave={
                WAVE_AT + (halfYear * g.rows.length + rowIndex) * WAVE_STAGGER
              }
              fade={counted ? 0 : FADE_AT + pale++ * 110}
              probe={
                g.probes.find(
                  (probe) =>
                    probe.row === rowIndex && probe.halfYear === halfYear,
                ) ?? null
              }
            />
          ))}
        </View>
      ))}
      <Legend cue={cue} top={g.legendTop} />
      <Panel cue={cue} g={g} />
      {g.probes.map((probe) => (
        <Flight
          key={probe.at}
          cue={cue}
          probe={probe}
          from={cellCentre(probe)}
          to={scoreCentre}
        />
      ))}
    </>
  );
};

/** One course: lights up or fades; a probe lifts it and adds a point. */
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
  probe: Probe | null;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const lit = useCue(cue, 0, counted ? 1 : 0, wave, 320, "ease");
  const dim = useCue(cue, 1, counted ? 1 : 0.3, fade, 420, "ease");
  const lift = useCue(cue, 0, probe ? 1 : 0, probe?.at ?? 0, 700, "land");
  const added = useSwitch(cue, probe ? probe.at + LIFT_MS : null);
  const shown = added ? points + 1 : points;

  const cellStyle = useAnimatedStyle(() => {
    // Up and back down in one move: the course hands its point over.
    const up = Math.sin(Math.min(1, lift.value) * Math.PI);
    return {
      opacity: Math.max(dim.value, up * 0.9),
      transform: [{ translateY: -7 * up }, { scale: 1 + 0.12 * up }],
    };
  });
  const litStyle = useAnimatedStyle(() => ({ opacity: lit.value }));

  return (
    <View style={styles.cell}>
      <Animated.View style={cellStyle}>
        <PointsBadge points={shown} maxFontScale={1} />
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
    </View>
  );
};

/** The +1 on its way from the course to the Abitur points. */
const Flight = ({
  cue,
  probe,
  from,
  to,
}: {
  cue: Cue;
  probe: Probe;
  from: { x: number; y: number };
  to: { x: number; y: number };
}) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const fly = useCue(cue, 0, 1, probe.at + LIFT_MS, FLY_MS, "settle");
  const style = useAnimatedStyle(() => {
    const p = fly.value;
    const arc = Math.sin(Math.min(1, p) * Math.PI) * -36;
    // A point that does not count never arrives: it fades on the way.
    const fade = probe.counts
      ? p >= 0.97 || p <= 0
        ? 0
        : 1
      : p <= 0
        ? 0
        : Math.max(0, 1 - Math.max(0, p - 0.45) / 0.35);
    return {
      opacity: fade,
      transform: [
        { translateX: from.x + (to.x - from.x) * p - CHIP_W / 2 },
        { translateY: from.y + (to.y - from.y) * p + arc - CHIP_H / 2 },
        { scale: probe.counts ? 1 : 1 - 0.3 * p },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.chip, { backgroundColor: colors.accent }, style]}
    >
      <StageText style={[NumberType.value, { color: colors.accentForeground }]}>
        {t("onboarding.story.focus.plus")}
      </StageText>
    </Animated.View>
  );
};

/** What light and faded mean, once the wave has run. */
const Legend = ({ cue, top }: { cue: Cue; top: number }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const shown = useCue(cue, 0, 1, FADE_AT + 200, 420, "ease");
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));
  return (
    <Animated.View style={[styles.legend, { top }, style]}>
      <View style={styles.legendItem}>
        <View style={[styles.swatch, { backgroundColor: colors.accent }]} />
        <StageText style={[Type.footnote, { color: colors.textSecondary }]}>
          {t("onboarding.story.focus.counted")}
        </StageText>
      </View>
      <View style={styles.legendItem}>
        <View
          style={[
            styles.swatch,
            styles.faded,
            { backgroundColor: colors.fill },
          ]}
        />
        <StageText style={[Type.footnote, { color: colors.textSecondary }]}>
          {t("onboarding.story.focus.notCounted")}
        </StageText>
      </View>
    </Animated.View>
  );
};

/** Counter, and the Abitur points that take (or don't take) the +1. */
const Panel = ({ cue, g }: { cue: Cue; g: Geometry }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const count = useCount(
    cue,
    0,
    g.counted,
    WAVE_AT,
    g.total * WAVE_STAGGER + 500,
  );
  const first = useSwitch(cue, arrival(PALE_AT) - FLY_MS * 0.15);
  const second = useSwitch(cue, arrival(COUNTED_AT) - 30);
  const roll = useCue(cue, 0, 1, arrival(COUNTED_AT) - 30, 420);
  const bump = useCue(cue, 0, 1, arrival(COUNTED_AT) - 30, 560, "land");
  const delta = second ? "+1" : first ? "±0" : "";

  const oldStyle = useAnimatedStyle(() => ({
    opacity: 1 - roll.value,
    transform: [{ translateY: -20 * roll.value }],
  }));
  const newStyle = useAnimatedStyle(() => ({
    opacity: roll.value,
    transform: [{ translateY: 20 * (1 - roll.value) }],
  }));
  const bumpStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + Math.sin(Math.min(1, bump.value) * Math.PI) * 0.16 },
    ],
  }));

  return (
    <View
      style={[
        styles.panel,
        { top: g.panelTop, height: PANEL_H, backgroundColor: colors.card },
      ]}
    >
      <View style={styles.flex}>
        <StageText lines={2} style={[Type.headline, { color: colors.accent }]}>
          {t("onboarding.story.focus.inclusion", { count, total: g.total })}
        </StageText>
      </View>
      <View style={styles.score}>
        <StageText style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("onboarding.story.focus.total")}
        </StageText>
        <View style={styles.scoreRow}>
          <StageText
            style={[
              Type.headline,
              { color: second ? colors.accent : colors.textSecondary },
            ]}
          >
            {delta}
          </StageText>
          <Animated.View style={[styles.number, bumpStyle]}>
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
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const CHIP_W = 40;
const CHIP_H = 26;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  cell: {
    width: CELL_W,
    alignItems: "center",
  },
  lit: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.badge,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    position: "absolute",
    left: 0,
    top: 0,
    width: CHIP_W,
    height: CHIP_H,
    borderRadius: CHIP_H / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  legend: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  faded: {
    opacity: 0.5,
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  score: {
    alignItems: "flex-end",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  number: {
    alignItems: "flex-end",
  },
});
