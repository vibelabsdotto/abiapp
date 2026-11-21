// Scene "explain": how grades become the average. Grades lie in a loose
// heap; they fly into two areas, courses (up to 600) and exams (up to
// 300), sized 2:1 like their share, whose bars fill and counters run as
// they land. Then the sum counts up in the arch to the student's goal
// from the first step and stands there as the average.

import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { GradeHero, PointsBadge, formatGrade } from "@components/ui";
import { NumberType, Radius, Type } from "@constants/typography";
import { gradeFromPoints, minPointsForGrade } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useStoryTarget } from "@stores/onboardingStory";
import { useThemeStore } from "@stores/themeStore";

import { useCount, useCue, type Cue } from "../motion";
import { SceneStage, StageText, scatter } from "./parts";

const HERO_H = 226;
const GAP = 12;
const BIN_H = 140;
const BIN_GAP = 10;
const BADGE_W = 32;
const BADGE_H = 24;
const BADGE_GAP = 5;
const PAD = 10;
const BADGES_TOP = 78;
const HEIGHT = HERO_H + GAP + BIN_H;

/** Example grades: courses first, then exams. */
const GRADES = [12, 11, 13, 10, 14, 9, 12, 13, 11, 10, 12, 15, 13, 11, 12, 14];

const FLY_START = 250;
const FLY_STAGGER = 55;
const FLY_MS = 760;
const HERO_AT = 1750;
const SUM_MS = 1150;

interface Bin {
  key: "courses" | "exams";
  x: number;
  width: number;
  max: number;
  slots: { x: number; y: number }[];
}

const layoutBins = (width: number): Bin[] => {
  const courses = Math.round(((width - BIN_GAP) * 2) / 3);
  const bins = [
    { key: "courses" as const, x: 0, width: courses, max: 600 },
    {
      key: "exams" as const,
      x: courses + BIN_GAP,
      width: width - courses - BIN_GAP,
      max: 300,
    },
  ];
  return bins.map((bin) => {
    const columns = Math.max(
      1,
      Math.floor((bin.width - 2 * PAD + BADGE_GAP) / (BADGE_W + BADGE_GAP)),
    );
    const slots = Array.from({ length: columns * 2 }, (_, index) => ({
      x: bin.x + PAD + (index % columns) * (BADGE_W + BADGE_GAP),
      y:
        HERO_H +
        GAP +
        BADGES_TOP +
        Math.floor(index / columns) * (BADGE_H + BADGE_GAP),
    }));
    return { ...bin, slots };
  });
};

export const ExplainScene = ({
  cue,
  onReplay,
}: {
  cue: Cue;
  onReplay: () => void;
}) => {
  const { t, locale } = useTranslation();
  const target = useStoryTarget();
  return (
    <SceneStage
      height={HEIGHT}
      label={t("onboarding.story.explain.a11y", {
        points: minPointsForGrade(target),
        grade: formatGrade(target, locale),
      })}
      onReplay={onReplay}
    >
      {(width) => <Explain cue={cue} width={width} target={target} />}
    </SceneStage>
  );
};

const Explain = ({
  cue,
  width,
  target,
}: {
  cue: Cue;
  width: number;
  target: number;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const bins = layoutBins(width);
  const total = minPointsForGrade(target);
  const blockI = Math.round((total * 2) / 3);
  const shares = { courses: blockI, exams: total - blockI };
  let grade = 0;
  const flights = bins.flatMap((bin) =>
    bin.slots.map((slot) => ({
      slot,
      points: GRADES[grade++ % GRADES.length],
    })),
  );
  const landed = (count: number) =>
    FLY_START + (count - 1) * FLY_STAGGER + FLY_MS * 0.55;
  const coursesCount = bins[0].slots.length;

  return (
    <>
      <Hero cue={cue} target={target} total={total} />
      {bins.map((bin, index) => (
        <View
          key={bin.key}
          style={[
            styles.bin,
            {
              left: bin.x,
              width: bin.width,
              top: HERO_H + GAP,
              backgroundColor: colors.card,
            },
          ]}
        >
          <StageText style={[Type.subhead, { color: colors.textSecondary }]}>
            {t(`onboarding.story.explain.${bin.key}`)}
          </StageText>
          <BinCount
            cue={cue}
            to={shares[bin.key]}
            max={bin.max}
            delay={index === 0 ? FLY_START + 200 : landed(coursesCount) - 200}
            duration={
              index === 0
                ? landed(coursesCount) - FLY_START - 200
                : landed(flights.length) - landed(coursesCount) + 200
            }
          />
          <BinBar
            cue={cue}
            share={shares[bin.key] / bin.max}
            width={bin.width - 2 * PAD}
            delay={index === 0 ? FLY_START + 200 : landed(coursesCount) - 200}
            duration={
              index === 0
                ? landed(coursesCount) - FLY_START
                : landed(flights.length) - landed(coursesCount) + 400
            }
          />
        </View>
      ))}
      {flights.map((flight, index) => (
        <Flying
          key={index}
          cue={cue}
          index={index}
          width={width}
          slot={flight.slot}
          points={flight.points}
        />
      ))}
    </>
  );
};

/** One grade: from the heap into its slot, on a spring that lands. */
const Flying = ({
  cue,
  index,
  width,
  slot,
  points,
}: {
  cue: Cue;
  index: number;
  width: number;
  slot: { x: number; y: number };
  points: number;
}) => {
  const heap = {
    x: width / 2 - BADGE_W / 2 + scatter(index, 1) * Math.min(190, width * 0.6),
    y: HERO_H / 2 - BADGE_H / 2 + scatter(index, 2) * 96,
    rotate: scatter(index, 3) * 46,
  };
  const fly = useCue(
    cue,
    0,
    1,
    FLY_START + index * FLY_STAGGER,
    FLY_MS,
    "land",
  );
  const style = useAnimatedStyle(() => {
    const p = fly.value;
    // Rise a little first, then drop into the slot: the arc leads.
    const lift = Math.sin(Math.min(1, p) * Math.PI) * -26;
    return {
      transform: [
        { translateX: heap.x + (slot.x - heap.x) * p },
        { translateY: heap.y + (slot.y - heap.y) * p + lift },
        { rotate: `${heap.rotate * (1 - p)}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.flying, style]}>
      <PointsBadge points={points} size="small" maxFontScale={1} />
    </Animated.View>
  );
};

const BinCount = ({
  cue,
  to,
  max,
  delay,
  duration,
}: {
  cue: Cue;
  to: number;
  max: number;
  delay: number;
  duration: number;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const value = useCount(cue, 0, to, delay, duration);
  return (
    <StageText style={[NumberType.value, { color: colors.text }]}>
      {value}
      <StageText style={[Type.subhead, { color: colors.textSecondary }]}>
        {` ${t("onboarding.story.explain.upTo", { points: max })}`}
      </StageText>
    </StageText>
  );
};

const BinBar = ({
  cue,
  share,
  width,
  delay,
  duration,
}: {
  cue: Cue;
  share: number;
  width: number;
  delay: number;
  duration: number;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const fill = useCue(cue, 0, share, delay, duration, "ease");
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -(1 - fill.value) * width }],
  }));
  return (
    <View style={[styles.track, { backgroundColor: colors.gaugeTrack }]}>
      <Animated.View
        style={[styles.trackFill, { backgroundColor: colors.accent }, style]}
      />
    </View>
  );
};

/** The sum, counting up in the arch to the goal. */
const Hero = ({
  cue,
  target,
  total,
}: {
  cue: Cue;
  target: number;
  total: number;
}) => {
  const { t } = useTranslation();
  const shown = useCue(cue, 0, 1, HERO_AT - 250, 420, "ease");
  // From the pass mark (300, grade 4,0): below it there is no grade.
  const points = useCount(cue, 300, total, HERO_AT, SUM_MS);
  const tenths = gradeFromPoints(points).tenths;
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: 0.96 + 0.04 * shown.value }],
  }));
  return (
    <Animated.View style={[styles.hero, style]}>
      <GradeHero
        gradeTenths={tenths}
        totalPoints={points}
        predicted
        basis="estimate"
        goalTenths={target}
        goalPoints={total}
        label={t("onboarding.done.goalLabel")}
        legend={false}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_H,
    justifyContent: "center",
  },
  bin: {
    position: "absolute",
    height: BIN_H,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: PAD,
    gap: 2,
  },
  track: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  trackFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 3,
  },
  flying: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
