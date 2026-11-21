// Scene "calculatedBefore": every state by its own rules. The 16 state
// codes as tiles get their check one after the other; a rule opens and
// shows its source (regulation and sections, the app's real data); then
// the tiles line up into the state list of the next page, the codes
// becoming its badges, the list running on past the edge.

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Check } from "lucide-react-native";

import { Icon } from "@components/ui";
import { NumberType, Radius, Type } from "@constants/typography";
import { listStates, rulesetsForState } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import { span } from "../motion";
import { useCue, type Cue } from "../motion";
import { SceneStage, StageText } from "./parts";

const COLUMNS = 4;
const TILE_H = 44;
const TILE_GAP = 8;
const GRID_H = 4 * TILE_H + 3 * TILE_GAP;
const ROW_H = 44;
/** Tiles shrink uniformly into the list's code badges. */
const BADGE_SCALE = 0.74;
const RULE_TOP = GRID_H + 14;
const RULE_CLOSED = 68;
const RULE_OPEN = 112;
const HEIGHT = RULE_TOP + RULE_OPEN;

const CHECK_AT = 200;
const CHECK_STAGGER = 62;
const RULE_AT = 1450;
const LIST_AT = 2350;
const LIST_STAGGER = 28;

/** The example rule: the first state in the list, its real ruleset. */
const useExampleRule = () =>
  useMemo(() => {
    const state = listStates()[0];
    const ruleset = rulesetsForState(state.code)[0];
    const source = ruleset.sources[0];
    const short = /\(([^)]+)\)/.exec(source.title)?.[1] ?? source.title;
    return {
      label: ruleset.label,
      courses: ruleset.blockICourses ?? null,
      source: [short, source.section].filter(Boolean).join(" "),
    };
  }, []);

export const StatesScene = ({
  cue,
  onReplay,
}: {
  cue: Cue;
  onReplay: () => void;
}) => {
  const { t } = useTranslation();
  const rule = useExampleRule();
  return (
    <SceneStage
      height={HEIGHT}
      label={t("onboarding.story.calculatedBefore.a11y", {
        source: rule.source,
      })}
      onReplay={onReplay}
    >
      {(width) => <States cue={cue} width={width} rule={rule} />}
    </SceneStage>
  );
};

const States = ({
  cue,
  width,
  rule,
}: {
  cue: Cue;
  width: number;
  rule: ReturnType<typeof useExampleRule>;
}) => {
  const states = useMemo(() => listStates(), []);
  const tileW = (width - (COLUMNS - 1) * TILE_GAP) / COLUMNS;
  return (
    <>
      <View style={[styles.grid, { height: GRID_H }]}>
        {states.map((state, index) => (
          <StateTile
            key={state.code}
            cue={cue}
            index={index}
            code={state.code}
            name={state.name}
            tileW={tileW}
          />
        ))}
      </View>
      <Rule cue={cue} rule={rule} />
    </>
  );
};

const StateTile = ({
  cue,
  index,
  code,
  name,
  tileW,
}: {
  cue: Cue;
  index: number;
  code: string;
  name: string;
  tileW: number;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const check = useCue(
    cue,
    0,
    1,
    CHECK_AT + index * CHECK_STAGGER,
    420,
    "land",
  );
  const list = useCue(cue, 0, 1, LIST_AT + index * LIST_STAGGER, 760);
  const grid = {
    x: (index % COLUMNS) * (tileW + TILE_GAP),
    y: Math.floor(index / COLUMNS) * (TILE_H + TILE_GAP),
  };
  // In the list the badge sits at the row's left edge, scaled about the
  // tile's centre: offset the centre so its left edge lands on 4.
  const row = {
    x: 4 - (tileW * (1 - BADGE_SCALE)) / 2,
    y: index * ROW_H - (TILE_H * (1 - BADGE_SCALE)) / 2,
  };
  const nameX = 4 + tileW * BADGE_SCALE + 12;

  const tileStyle = useAnimatedStyle(() => {
    const p = list.value;
    // Rows that land below the stage run on out of sight.
    const visible = 1 - span(index * ROW_H, GRID_H - ROW_H * 1.4, GRID_H);
    return {
      opacity: 1 - (1 - visible) * span(p, 0.2, 0.9),
      transform: [
        { translateX: grid.x + (row.x - grid.x) * p },
        { translateY: grid.y + (row.y - grid.y) * p },
        { scale: 1 - (1 - BADGE_SCALE) * p },
      ],
    };
  });
  const badgeFace = useAnimatedStyle(() => ({
    opacity: span(list.value, 0.3, 0.8),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, check.value * 2) * (1 - span(list.value, 0, 0.4)),
    transform: [{ scale: 0.5 + 0.5 * check.value }],
  }));
  const nameStyle = useAnimatedStyle(() => {
    const p = list.value;
    const visible = 1 - span(index * ROW_H, GRID_H - ROW_H * 1.4, GRID_H);
    return {
      opacity: span(p, 0.55, 1) * visible,
      transform: [
        { translateX: nameX + 12 * (1 - p) },
        { translateY: index * ROW_H + (TILE_H - 22) / 2 },
      ],
    };
  });

  return (
    <>
      <Animated.View
        style={[
          styles.tile,
          { width: tileW, backgroundColor: colors.card },
          tileStyle,
        ]}
      >
        <StageText style={[NumberType.title, { color: colors.text }]}>
          {code}
        </StageText>
        <Animated.View
          style={[
            styles.badgeFace,
            { backgroundColor: colors.accentLight },
            badgeFace,
          ]}
        >
          <StageText style={[NumberType.title, { color: colors.accent }]}>
            {code}
          </StageText>
        </Animated.View>
        <Animated.View style={[styles.check, checkStyle]}>
          <Icon icon={Check} size={16} color={colors.accent} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.name, nameStyle]}>
        <StageText style={[Type.body, { color: colors.text }]}>
          {name}
        </StageText>
      </Animated.View>
    </>
  );
};

/** One rule that opens to show where it comes from. */
const Rule = ({
  cue,
  rule,
}: {
  cue: Cue;
  rule: ReturnType<typeof useExampleRule>;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const shown = useCue(cue, 0, 1, RULE_AT - 350, 380, "ease");
  const open = useCue(cue, 0, 1, RULE_AT, 520);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    height: RULE_CLOSED + (RULE_OPEN - RULE_CLOSED) * open.value,
    transform: [{ translateY: 10 * (1 - shown.value) }],
  }));
  const sourceStyle = useAnimatedStyle(() => ({
    opacity: span(open.value, 0.35, 1),
    transform: [{ translateY: -6 * (1 - open.value) }],
  }));
  const courses = rule.courses
    ? rule.courses.min === rule.courses.max
      ? t("onboarding.rules.blockICourses", { count: rule.courses.min })
      : t("onboarding.rules.blockICoursesRange", rule.courses)
    : null;

  return (
    <Animated.View
      style={[
        styles.rule,
        { top: RULE_TOP, backgroundColor: colors.card },
        cardStyle,
      ]}
    >
      <StageText style={[Type.headline, { color: colors.text }]}>
        {rule.label}
      </StageText>
      {courses ? (
        <StageText style={[Type.subhead, { color: colors.textSecondary }]}>
          {`${t("onboarding.story.calculatedBefore.rule")} · ${courses}`}
        </StageText>
      ) : null}
      <Animated.View style={[styles.source, sourceStyle]}>
        <StageText lines={2} style={[Type.subhead, { color: colors.accent }]}>
          {t("onboarding.story.calculatedBefore.source", {
            source: rule.source,
          })}
        </StageText>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    overflow: "hidden",
  },
  tile: {
    position: "absolute",
    left: 0,
    top: 0,
    height: TILE_H,
    borderRadius: Radius.control,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeFace: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  name: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  rule: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
    overflow: "hidden",
  },
  source: {
    paddingTop: 8,
  },
});
