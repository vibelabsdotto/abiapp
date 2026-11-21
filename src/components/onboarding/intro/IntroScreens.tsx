// The four screens inside the intro phone, built from the app's own
// building blocks with fixed example values: the average as the arch
// (counting up), the courses that count, what the next exam takes and the
// 16 states. Laid out at PhoneFrame's logical width (290 pt).
//
// Each beat also has a camera: keyframes that move and zoom the phone onto
// one part of its screen (an anchor), like the "stage" pose of a product
// film. Anchors report their position with onLayout.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  ArchGauge,
  PointsBadge,
  SubjectAvatar,
  formatGrade,
} from "@components/ui";
import { NumberType, Radius, Type } from "@constants/typography";
import {
  gradeFromPoints,
  listStates,
  minPointsForGrade,
  rulesetsForState,
} from "@domain/index";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { defaultSubjectColor } from "@utils/subjectColor";

export type IntroBeat = "standing" | "counts" | "needs" | "states";
export const INTRO_BEATS: readonly IntroBeat[] = [
  "standing",
  "counts",
  "needs",
  "states",
];

/** How long each beat stays on screen. */
export const BEAT_MS: Record<IntroBeat, number> = {
  standing: 3800,
  counts: 3900,
  needs: 3300,
  states: 3500,
};

export interface CameraKey {
  /** ms after the beat started. */
  at: number;
  /** Phone scale relative to its natural width. */
  zoom: number;
  /** Anchor whose centre the camera centres. */
  anchor: string;
}

export const CAMERA: Record<IntroBeat, CameraKey[]> = {
  standing: [
    { at: 650, zoom: 1.3, anchor: "arch" },
    { at: 2500, zoom: 1.2, anchor: "blocks" },
  ],
  counts: [
    { at: 0, zoom: 1.22, anchor: "matrix" },
    { at: 2150, zoom: 1.28, anchor: "caption" },
  ],
  needs: [{ at: 0, zoom: 1.28, anchor: "hero" }],
  states: [
    { at: 0, zoom: 1.2, anchor: "grid" },
    { at: 2050, zoom: 1.25, anchor: "caption" },
  ],
};

export type AnchorMap = Record<string, { y: number; height: number }>;
type OnAnchor = (name: string, y: number, height: number) => void;

// Example values. The grade always comes from the engine's own scale.
const DEMO_TOTAL = 612;
const DEMO_GOAL_TENTHS = 15;
const DEMO_NEXT_EXAM = 12;
/** The state the tap lands on in beat 4, and its real ruleset. */
const DEMO_STATE = "SN";
const DEMO_RULES = (() => {
  const ruleset = rulesetsForState(DEMO_STATE)[0];
  const source = ruleset.sources[0];
  // "Schulordnung … (SOGYA) vom …": the short name in brackets reads best.
  const short = /\(([^)]+)\)/.exec(source.title)?.[1] ?? source.title;
  return {
    label: ruleset.label,
    source: [short, source.section].filter(Boolean).join(" "),
  };
})();

/** A direct child of a screen that the camera can centre on. */
const Anchor = ({
  name,
  onAnchor,
  children,
  style,
}: {
  name: string;
  onAnchor: OnAnchor;
  children: React.ReactNode;
  style?: object;
}) => (
  <View
    style={style}
    onLayout={(event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      onAnchor(name, y, height);
    }}
  >
    {children}
  </View>
);

/** Ease-out count from 0 to `target` (JS frames; one short run). */
const useCountUp = (
  target: number,
  duration: number,
  delay: number,
  animate: boolean,
) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay, animate]);
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

interface ScreenProps {
  animate: boolean;
  onAnchor: OnAnchor;
}

/** A demo subject as the app shows it: catalog icon and default colour. */
export const demoSubject = (key: string) => ({
  catalogKey: key,
  color: defaultSubjectColor({ catalogKey: key, tags: [] }, []),
});

const DEMO_ROWS: {
  name: string;
  key: string;
  cells: [number, boolean][];
}[] = [
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
      [9, false],
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

// ---------------------------------------------------------------------------
// Beat 1: where you stand
// ---------------------------------------------------------------------------

const StandingScreen = ({ animate, onAnchor }: ScreenProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();
  const points = useCountUp(DEMO_TOTAL, 1500, 650, animate);
  const tenths = gradeFromPoints(points).tenths;
  const blockI = Math.round((points * 408) / DEMO_TOTAL);

  return (
    <View style={styles.screen}>
      <ScreenTitle title={t("tabs.home")} />
      <Anchor name="arch" onAnchor={onAnchor} style={styles.hero}>
        <ArchGauge
          width={262}
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
      </Anchor>
      <Anchor name="blocks" onAnchor={onAnchor} style={styles.tiles}>
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
              style={[Type.subhead, { color: colors.textSecondary }]}
            >
              {tile.label}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[NumberType.title, { color: colors.text }]}
            >
              {tile.value}
              <Text style={[Type.subhead, { color: colors.textSecondary }]}>
                {` / ${tile.max}`}
              </Text>
            </Text>
          </View>
        ))}
      </Anchor>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {DEMO_ROWS.slice(0, 4).map((row) => (
          <View key={row.name} style={styles.subjectRow}>
            <SubjectAvatar {...demoSubject(row.key)} size={30} />
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
      ? withDelay(delay, withTiming(0.25, { duration: 380 }))
      : 0.25;
  }, [animate, counted, delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.cell, style]}>
      <PointsBadge points={points} size="small" maxFontScale={1} />
    </Animated.View>
  );
};

const INCLUSION = {
  total: DEMO_ROWS.length * 4,
  count: DEMO_ROWS.reduce(
    (sum, row) => sum + row.cells.filter(([, inc]) => inc).length,
    0,
  ),
};

/** Block I as subjects x half-years; the courses that don't count fade. */
const InclusionMatrix = ({ animate }: { animate: boolean }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  let dimIndex = 0;
  return (
    <View
      style={[styles.card, styles.matrix, { backgroundColor: colors.card }]}
    >
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
            <SubjectAvatar {...demoSubject(row.key)} size={26} />
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[Type.subhead, styles.flex, { color: colors.text }]}
            >
              {t(`onboarding.demo.short.${row.name}`)}
            </Text>
          </View>
          {row.cells.map(([points, inc], index) => (
            <DimCell
              key={index}
              points={points}
              counted={inc}
              delay={inc ? 0 : 450 + dimIndex++ * 210}
              animate={animate}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const CountsScreen = ({ animate, onAnchor }: ScreenProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <ScreenTitle title="Block I" />
      <Anchor name="matrix" onAnchor={onAnchor}>
        <InclusionMatrix animate={animate} />
      </Anchor>
      <Anchor name="caption" onAnchor={onAnchor}>
        <Animated.View
          entering={animate ? FadeInDown.delay(1900).duration(450) : undefined}
          style={styles.captionBlock}
        >
          <Text
            allowFontScaling={false}
            style={[NumberType.hero, styles.bigCount, { color: colors.accent }]}
          >
            {`${INCLUSION.count}/${INCLUSION.total}`}
          </Text>
          <Text
            allowFontScaling={false}
            style={[Type.title3, styles.center, { color: colors.text }]}
          >
            {t("onboarding.demo.inclusion", INCLUSION)}
          </Text>
          <View style={styles.legend}>
            {[true, false].map((counted) => (
              <View
                key={String(counted)}
                style={[styles.legendItem, !counted && styles.faded]}
              >
                <PointsBadge points={12} size="small" maxFontScale={1} />
                <Text
                  allowFontScaling={false}
                  style={[Type.subhead, { color: colors.textSecondary }]}
                >
                  {t(
                    counted
                      ? "onboarding.demo.counted"
                      : "onboarding.demo.notCounted",
                  )}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </Anchor>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Beat 3: what you still need
// ---------------------------------------------------------------------------

const NeedsScreen = ({ animate, onAnchor }: ScreenProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();
  const goalPoints = minPointsForGrade(DEMO_GOAL_TENTHS);
  const grade = formatGrade(DEMO_GOAL_TENTHS, locale);
  const maths = t("onboarding.demo.maths");

  return (
    <View style={styles.screen}>
      <ScreenTitle title={maths} />
      <Anchor name="goal" onAnchor={onAnchor}>
        <View
          style={[
            styles.card,
            styles.goalCard,
            { backgroundColor: colors.card },
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[Type.headline, styles.center, { color: colors.text }]}
          >
            {t("home.goal.titleMissing", {
              grade,
              points: goalPoints - DEMO_TOTAL,
            })}
          </Text>
        </View>
      </Anchor>
      <Anchor name="hero" onAnchor={onAnchor}>
        <View
          style={[
            styles.card,
            styles.examHero,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.examHead}>
            <SubjectAvatar {...demoSubject("ma")} size={34} />
            <Text
              allowFontScaling={false}
              style={[Type.title3, { color: colors.text }]}
            >
              {t("onboarding.demo.nextExam", { subject: maths })}
            </Text>
          </View>
          <Animated.View
            entering={
              animate
                ? ZoomIn.delay(850).springify().damping(12).stiffness(140)
                : undefined
            }
            // Outline: a prognosis, like PointsBadge's "grades" shape.
            style={[styles.needBox, { borderColor: colors.accent }]}
          >
            <Text
              allowFontScaling={false}
              style={[
                NumberType.hero,
                styles.needNumber,
                { color: colors.accent },
              ]}
            >
              {DEMO_NEXT_EXAM}
            </Text>
          </Animated.View>
          <Text
            allowFontScaling={false}
            style={[Type.title3, styles.center, { color: colors.text }]}
          >
            {t("onboarding.demo.atLeast", { points: DEMO_NEXT_EXAM })}
          </Text>
        </View>
      </Anchor>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Beat 4: 16 states
// ---------------------------------------------------------------------------

const StateTile = ({
  code,
  index,
  picked,
  animate,
}: {
  code: string;
  index: number;
  picked: boolean;
  animate: boolean;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const fill = useSharedValue(picked && !animate ? 1 : 0);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (!picked || !animate) return;
    // The tap: a touch lands on the tile, then the tile fills.
    ring.value = withDelay(
      1250,
      withSequence(
        withTiming(1, { duration: 160 }),
        withTiming(0, { duration: 420 }),
      ),
    );
    fill.value = withDelay(1380, withSpring(1, { damping: 14 }));
  }, [animate, fill, picked, ring]);
  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: 0.6 + fill.value * 0.4 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value * 0.35,
    transform: [{ scale: 1.5 - ring.value * 0.5 }],
  }));

  return (
    <Animated.View
      entering={
        animate
          ? ZoomIn.delay(80 + index * 45)
              .duration(300)
              .easing(Easing.out(Easing.back(1.6)))
          : undefined
      }
      style={[styles.gridCell, { backgroundColor: colors.card }]}
    >
      <Text
        allowFontScaling={false}
        style={[NumberType.title, { color: colors.text }]}
      >
        {code}
      </Text>
      {picked ? (
        <>
          <Animated.View
            style={[
              styles.gridFill,
              { backgroundColor: colors.accent },
              fillStyle,
            ]}
          >
            <Text
              allowFontScaling={false}
              style={[NumberType.title, { color: colors.accentForeground }]}
            >
              {code}
            </Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tapRing,
              { backgroundColor: colors.textSecondary },
              ringStyle,
            ]}
          />
        </>
      ) : null}
    </Animated.View>
  );
};

const StatesScreen = ({ animate, onAnchor }: ScreenProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const states = listStates();

  return (
    <View style={styles.screen}>
      <ScreenTitle title={t("onboarding.state.title")} />
      <Anchor name="grid" onAnchor={onAnchor} style={styles.grid}>
        {states.map((state, index) => (
          <StateTile
            key={state.code}
            code={state.code}
            index={index}
            picked={state.code === DEMO_STATE}
            animate={animate}
          />
        ))}
      </Anchor>
      <Anchor name="caption" onAnchor={onAnchor}>
        <Animated.View
          entering={animate ? FadeInDown.delay(1850).duration(450) : undefined}
        >
          <Text
            allowFontScaling={false}
            style={[Type.title1, styles.center, { color: colors.text }]}
          >
            {t("onboarding.demo.states")}
          </Text>
          <View
            style={[
              styles.card,
              styles.ruleCard,
              { backgroundColor: colors.card },
            ]}
          >
            <Text
              allowFontScaling={false}
              style={[Type.headline, { color: colors.text }]}
            >
              {DEMO_RULES.label}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={2}
              style={[Type.subhead, { color: colors.textSecondary }]}
            >
              {t("onboarding.demo.rules", { source: DEMO_RULES.source })}
            </Text>
          </View>
        </Animated.View>
      </Anchor>
    </View>
  );
};

export const IntroScreen = ({
  beat,
  animate,
  onAnchor,
}: {
  beat: IntroBeat;
  animate: boolean;
  onAnchor: OnAnchor;
}) => {
  switch (beat) {
    case "standing":
      return <StandingScreen animate={animate} onAnchor={onAnchor} />;
    case "counts":
      return <CountsScreen animate={animate} onAnchor={onAnchor} />;
    case "needs":
      return <NeedsScreen animate={animate} onAnchor={onAnchor} />;
    case "states":
      return <StatesScreen animate={animate} onAnchor={onAnchor} />;
  }
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingTop: 44,
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
    paddingTop: 4,
  },
  heroGrade: {
    fontSize: 72,
    lineHeight: 78,
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
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 3,
  },
  matrix: {
    gap: 10,
    paddingVertical: 14,
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
  captionBlock: {
    alignItems: "center",
    gap: 2,
    paddingTop: 6,
  },
  bigCount: {
    fontSize: 64,
    lineHeight: 70,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    paddingTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  faded: {
    opacity: 0.4,
  },
  ruleCard: {
    marginTop: 14,
    gap: 2,
    alignSelf: "stretch",
  },
  goalCard: {
    paddingVertical: 16,
    alignItems: "center",
  },
  examHero: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 20,
  },
  examHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  needBox: {
    borderWidth: 3,
    borderRadius: 28,
    borderCurve: "continuous",
    paddingHorizontal: 34,
    paddingVertical: 4,
  },
  needNumber: {
    fontSize: 112,
    lineHeight: 124,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  gridCell: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: Radius.control,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  gridFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.control,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  tapRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
