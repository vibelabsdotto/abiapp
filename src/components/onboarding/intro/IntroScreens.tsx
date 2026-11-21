// The four screens inside the intro phone, built from the app's own
// building blocks with fixed example values: the average as the arch
// (counting up), the courses that count, what the goal takes and the 16
// states. Laid out at PhoneFrame's logical width (320 pt).

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  ArchGauge,
  PointsBadge,
  SubjectAvatar,
  formatGrade,
} from "@components/ui";
import { NumberType, Radius, Type } from "@constants/typography";
import { gradeFromPoints, listStates, minPointsForGrade } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

export type IntroBeat = "standing" | "counts" | "needs" | "states";
export const INTRO_BEATS: readonly IntroBeat[] = [
  "standing",
  "counts",
  "needs",
  "states",
];

// Example values. The grade always comes from the engine's own scale.
const DEMO_TOTAL = 612;
const DEMO_GOAL_TENTHS = 15;
const DEMO_NEXT_EXAM = 12;

/** Ease-out count from 0 to `target` (JS frames; one short run). */
const useCountUp = (target: number, duration: number, animate: boolean) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, animate]);
  return animate ? value : target;
};

const ScreenTitle = ({ title }: { title: string }) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={1}
      style={[Type.largeTitle, styles.title, { color: colors.text }]}
    >
      {title}
    </Text>
  );
};

// ---------------------------------------------------------------------------
// Beat 1: where you stand
// ---------------------------------------------------------------------------

const StandingScreen = ({ animate }: { animate: boolean }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();
  const points = useCountUp(DEMO_TOTAL, 1400, animate);
  const tenths = gradeFromPoints(points).tenths;
  const blockI = Math.round((points * 408) / DEMO_TOTAL);

  return (
    <View style={styles.screen}>
      <ScreenTitle title={t("tabs.home")} />
      <View style={styles.hero}>
        <ArchGauge
          width={230}
          progress={points / 900}
          color={colors.accent}
          trackColor={colors.separator}
          surfaceColor={colors.background}
          strokeRatio={0.055}
          legRatio={0.42}
          trackWidth={1}
          fill="outline"
          animated={false}
          markers={[
            { at: 300 / 900, kind: "tick", color: colors.textSecondary },
            { at: 823 / 900, kind: "tick", color: colors.textSecondary },
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[
              Type.footnote,
              styles.center,
              { color: colors.textSecondary },
            ]}
          >
            {t("ui.hero.prognosis")}
          </Text>
          <Text
            allowFontScaling={false}
            style={[
              NumberType.hero,
              styles.heroGrade,
              { color: tenths !== null ? colors.text : colors.textTertiary },
            ]}
          >
            {tenths !== null ? formatGrade(tenths, locale) : "–"}
          </Text>
          <Text
            allowFontScaling={false}
            style={[
              Type.subhead,
              styles.center,
              styles.tabular,
              { color: colors.textSecondary },
            ]}
          >
            {t("ui.hero.totalOf", { points, max: 900 })}
          </Text>
        </ArchGauge>
      </View>
      <View style={styles.tiles}>
        {[
          { label: "Block I", value: blockI, max: 600 },
          { label: "Block II", value: points - blockI, max: 300 },
        ].map((tile) => (
          <View
            key={tile.label}
            style={[styles.tile, { backgroundColor: colors.card }]}
          >
            <Text
              allowFontScaling={false}
              style={[Type.footnote, { color: colors.textSecondary }]}
            >
              {tile.label}
            </Text>
            <Text
              allowFontScaling={false}
              style={[NumberType.title, { color: colors.text }]}
            >
              {tile.value}
              <Text style={[Type.subhead, { color: colors.textSecondary }]}>
                {` / ${tile.max}`}
              </Text>
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {DEMO_ROWS.slice(0, 3).map((row) => (
          <View key={row.name} style={styles.subjectRow}>
            <SubjectAvatar
              name={t(`onboarding.demo.${row.name}`)}
              color={row.color}
              size={28}
            />
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[Type.body, styles.flex, { color: colors.text }]}
            >
              {t(`onboarding.demo.${row.name}`)}
            </Text>
            <PointsBadge
              points={row.cells[3][0]}
              exact={row.cells[3][0] + 0.4}
              source="grades"
              size="small"
              maxFontScale={1}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Beat 2: what counts
// ---------------------------------------------------------------------------

/** Points per half-year; false = not counted in the best inclusion. */
const DEMO_ROWS: {
  name: string;
  color: string;
  cells: [number, boolean][];
}[] = [
  {
    name: "german",
    color: "blue",
    cells: [
      [12, true],
      [13, true],
      [11, true],
      [12, true],
    ],
  },
  {
    name: "maths",
    color: "slate",
    cells: [
      [10, true],
      [12, true],
      [13, true],
      [11, true],
    ],
  },
  {
    name: "english",
    color: "violet",
    cells: [
      [9, false],
      [11, true],
      [8, false],
      [12, true],
    ],
  },
  {
    name: "biology",
    color: "green",
    cells: [
      [13, true],
      [7, false],
      [12, true],
      [10, true],
    ],
  },
  {
    name: "history",
    color: "orange",
    cells: [
      [6, false],
      [8, false],
      [11, true],
      [9, true],
    ],
  },
];

const DimCell = ({
  points,
  counted,
  delay,
  animate,
}: {
  points: number;
  counted: boolean;
  delay: number;
  animate: boolean;
}) => {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (counted) return;
    opacity.value = animate
      ? withDelay(delay, withTiming(0.28, { duration: 420 }))
      : 0.28;
  }, [animate, counted, delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.cell, style]}>
      <PointsBadge points={points} size="small" maxFontScale={1} />
    </Animated.View>
  );
};

/** Block I as subjects x half-years; the courses that don't count fade. */
export const DemoInclusion = ({ animate }: { animate: boolean }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const total = DEMO_ROWS.length * 4;
  const counted = DEMO_ROWS.reduce(
    (sum, row) => sum + row.cells.filter(([, inc]) => inc).length,
    0,
  );
  let dimIndex = 0;

  return (
    <View style={styles.inclusion}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.matrixRow}>
          <View style={styles.matrixName} />
          {[1, 2, 3, 4].map((index) => (
            <Text
              key={index}
              allowFontScaling={false}
              style={[
                Type.caption1,
                styles.cell,
                styles.center,
                { color: colors.textSecondary },
              ]}
            >
              {t("onboarding.demo.halfYear", { index })}
            </Text>
          ))}
        </View>
        {DEMO_ROWS.map((row) => (
          <View key={row.name} style={styles.matrixRow}>
            <View style={styles.matrixName}>
              <SubjectAvatar
                name={t(`onboarding.demo.${row.name}`)}
                color={row.color}
                size={26}
              />
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={[Type.subhead, styles.flex, { color: colors.text }]}
              >
                {t(`onboarding.demo.${row.name}`)}
              </Text>
            </View>
            {row.cells.map(([points, inc], index) => {
              const delay = inc ? 0 : 450 + dimIndex++ * 160;
              return (
                <DimCell
                  key={index}
                  points={points}
                  counted={inc}
                  delay={delay}
                  animate={animate}
                />
              );
            })}
          </View>
        ))}
      </View>
      <Animated.View
        entering={animate ? FadeIn.delay(1300).duration(400) : undefined}
        style={styles.legendRow}
      >
        <Text
          allowFontScaling={false}
          style={[Type.headline, { color: colors.accent }]}
        >
          {t("onboarding.demo.inclusion", { count: counted, total })}
        </Text>
      </Animated.View>
    </View>
  );
};

const CountsScreen = ({ animate }: { animate: boolean }) => (
  <View style={styles.screen}>
    <ScreenTitle title="Block I" />
    <DemoInclusion animate={animate} />
  </View>
);

// ---------------------------------------------------------------------------
// Beat 3: what you still need
// ---------------------------------------------------------------------------

const NeedsScreen = ({ animate }: { animate: boolean }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();
  const goalPoints = minPointsForGrade(DEMO_GOAL_TENTHS);
  const grade = formatGrade(DEMO_GOAL_TENTHS, locale);
  const enter = (delay: number) =>
    animate ? FadeInDown.delay(delay).duration(420) : undefined;

  return (
    <View style={styles.screen}>
      <ScreenTitle title={t("tabs.home")} />
      <View style={styles.hero}>
        <ArchGauge
          width={190}
          progress={DEMO_TOTAL / 900}
          color={colors.accent}
          trackColor={colors.separator}
          surfaceColor={colors.background}
          strokeRatio={0.055}
          legRatio={0.42}
          trackWidth={1}
          fill="outline"
          animated={animate}
          markers={[{ at: goalPoints / 900, kind: "dot", color: colors.text }]}
        >
          <Text
            allowFontScaling={false}
            style={[NumberType.display, styles.center, { color: colors.text }]}
          >
            {formatGrade(gradeFromPoints(DEMO_TOTAL).tenths ?? 40, locale)}
          </Text>
        </ArchGauge>
      </View>
      <Animated.View
        entering={enter(250)}
        style={[styles.card, styles.goalCard, { backgroundColor: colors.card }]}
      >
        <Text
          allowFontScaling={false}
          style={[Type.headline, { color: colors.text }]}
        >
          {t("home.goal.titleMissing", {
            grade,
            points: goalPoints - DEMO_TOTAL,
          })}
        </Text>
      </Animated.View>
      <Animated.View
        entering={enter(650)}
        style={[styles.card, styles.examCard, { backgroundColor: colors.card }]}
      >
        <SubjectAvatar
          name={t("onboarding.demo.maths")}
          color="slate"
          size={36}
        />
        <View style={styles.flex}>
          <Text
            allowFontScaling={false}
            style={[Type.headline, { color: colors.text }]}
          >
            {t("onboarding.demo.maths")}
          </Text>
          <Text
            allowFontScaling={false}
            style={[Type.subhead, { color: colors.textSecondary }]}
          >
            {t("subjects.goal.nextExam")}
          </Text>
        </View>
        <Animated.View
          entering={animate ? ZoomIn.delay(1050).springify() : undefined}
        >
          <PointsBadge
            points={DEMO_NEXT_EXAM}
            source="grades"
            showDecimal={false}
            size="medium"
            maxFontScale={1}
          />
        </Animated.View>
      </Animated.View>
      <Animated.View entering={enter(1100)}>
        <Text
          allowFontScaling={false}
          style={[Type.subhead, styles.center, { color: colors.textSecondary }]}
        >
          {t("onboarding.demo.atLeast", { points: DEMO_NEXT_EXAM })}
        </Text>
      </Animated.View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Beat 4: 16 states
// ---------------------------------------------------------------------------

const StatesScreen = ({ animate }: { animate: boolean }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const states = listStates();

  return (
    <View style={styles.screen}>
      <ScreenTitle title={t("onboarding.state.title")} />
      <View style={styles.grid}>
        {states.map((state, index) => (
          <Animated.View
            key={state.code}
            entering={
              animate
                ? ZoomIn.delay(120 + index * 55)
                    .duration(320)
                    .easing(Easing.out(Easing.back(1.6)))
                : undefined
            }
            style={[styles.gridCell, { backgroundColor: colors.card }]}
          >
            <Text
              allowFontScaling={false}
              style={[NumberType.value, { color: colors.text }]}
            >
              {state.code}
            </Text>
          </Animated.View>
        ))}
      </View>
      <Animated.View
        entering={animate ? FadeIn.delay(1150).duration(400) : undefined}
      >
        <Text
          allowFontScaling={false}
          style={[Type.title3, styles.center, { color: colors.text }]}
        >
          {t("onboarding.demo.states")}
        </Text>
      </Animated.View>
    </View>
  );
};

export const IntroScreen = ({
  beat,
  animate,
}: {
  beat: IntroBeat;
  animate: boolean;
}) => {
  switch (beat) {
    case "standing":
      return <StandingScreen animate={animate} />;
    case "counts":
      return <CountsScreen animate={animate} />;
    case "needs":
      return <NeedsScreen animate={animate} />;
    case "states":
      return <StatesScreen animate={animate} />;
  }
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 14,
    gap: 16,
  },
  title: {
    paddingHorizontal: 4,
  },
  center: {
    textAlign: "center",
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
  hero: {
    alignItems: "center",
    paddingTop: 6,
  },
  heroGrade: {
    fontSize: 64,
    lineHeight: 70,
    textAlign: "center",
  },
  tiles: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: 14,
    gap: 2,
  },
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: 12,
    gap: 8,
  },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  matrixName: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cell: {
    width: 36,
    alignItems: "center",
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 2,
  },
  inclusion: {
    gap: 16,
  },
  legendRow: {
    alignItems: "center",
  },
  goalCard: {
    paddingVertical: 16,
    alignItems: "center",
  },
  examCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    paddingTop: 4,
  },
  gridCell: {
    width: "23%",
    aspectRatio: 1.1,
    borderRadius: Radius.control,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});
