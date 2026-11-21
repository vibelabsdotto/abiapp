// Scene "examShare": a third. The 900-point bar fills with the courses,
// then the exams grow in the accent onto exactly one third. Below, an
// exam block lands next to course terms and stands twice as tall as the
// best of them (an exam brings 60 or more, a course term 30 at most).
// Last, a short subject list gets its checks for "geht als Prüfungsfach".

import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Check } from "lucide-react-native";

import { Icon, SubjectAvatar } from "@components/ui";
import { NumberType, Radius, Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import { demoSubject } from "../../intro/IntroScreens";
import { useCue, type Cue } from "../motion";
import { SceneStage, StageText } from "./parts";

const BAR_TOP = 22;
const BAR_H = 14;
/** Height of one course term at its maximum (30 points). */
const UNIT = 38;
const TILE_W = 40;
const TILE_GAP = 6;
const COMPARE_TOP = BAR_TOP + BAR_H + 22;
const COMPARE_H = 2 * UNIT + 40;
const LIST_TOP = COMPARE_TOP + COMPARE_H + 14;
const ROW_H = 36;
const SUBJECTS = [
  { name: "german", key: "de" },
  { name: "maths", key: "ma" },
  { name: "english", key: "en" },
];
const HEIGHT = LIST_TOP + 20 + SUBJECTS.length * ROW_H;

const COURSES_AT = 150;
const EXAMS_AT = 750;
const TILES_AT = 1350;
const BLOCK_AT = 1750;
const LIST_AT = 2450;
const CHECK_AT = 2700;
const CHECK_STAGGER = 260;

export const ExamShareScene = ({
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
      label={t("onboarding.story.examShare.a11y")}
      onReplay={onReplay}
    >
      {(width) => <ExamShare cue={cue} width={width} />}
    </SceneStage>
  );
};

const ExamShare = ({ cue, width }: { cue: Cue; width: number }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const courses = useCue(cue, 0, 1, COURSES_AT, 620, "ease");
  const exams = useCue(cue, 0, 1, EXAMS_AT, 700);
  const third = width / 3;

  const coursesStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(1 - courses.value) * (width - third) }],
  }));
  // The exam share grows from the right end onto exactly one third.
  const examsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - exams.value) * third }],
  }));
  const examLabelStyle = useAnimatedStyle(() => ({
    opacity: exams.value,
  }));

  return (
    <>
      <View style={styles.barLabels}>
        <StageText style={[Type.subhead, { color: colors.textSecondary }]}>
          {t("onboarding.story.examShare.courses")}
          <StageText style={[NumberType.value, { color: colors.text }]}>
            {"  600"}
          </StageText>
        </StageText>
        <Animated.View style={examLabelStyle}>
          <StageText style={[Type.subhead, { color: colors.accent }]}>
            {t("onboarding.story.examShare.exams")}
            <StageText style={[NumberType.value, { color: colors.accent }]}>
              {"  300"}
            </StageText>
          </StageText>
        </Animated.View>
      </View>
      <View
        style={[
          styles.bar,
          { top: BAR_TOP, backgroundColor: colors.gaugeTrack },
        ]}
      >
        <View style={[styles.segment, { width: width - third }]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.textTertiary },
              coursesStyle,
            ]}
          />
        </View>
        <View
          style={[
            styles.segment,
            { left: width - third, width: third, overflow: "hidden" },
          ]}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.accent },
              examsStyle,
            ]}
          />
        </View>
      </View>
      <Compare cue={cue} />
      <View style={[styles.list, { top: LIST_TOP }]}>
        <ListHead cue={cue} />
        {SUBJECTS.map((subject, index) => (
          <SubjectCheck
            key={subject.key}
            cue={cue}
            name={t(`onboarding.demo.${subject.name}`)}
            catalogKey={subject.key}
            delay={CHECK_AT + index * CHECK_STAGGER}
            rowDelay={LIST_AT + index * 70}
          />
        ))}
      </View>
    </>
  );
};

/** Three course terms at their best, then one exam lands next to them. */
const Compare = ({ cue }: { cue: Cue }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const slide = useCue(cue, 0, 1, BLOCK_AT, 560, "land");
  const rise = useCue(cue, 0, 1, BLOCK_AT + 260, 520);
  const blockStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, slide.value * 3),
    transform: [{ translateX: 46 * (1 - slide.value) }],
  }));
  // The exam's second unit grows up out of the first: twice as tall.
  const riseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: UNIT * (1 - rise.value) }],
  }));
  const examTextStyle = useAnimatedStyle(() => ({ opacity: rise.value }));

  return (
    <View style={[styles.compare, { top: COMPARE_TOP }]}>
      <View style={styles.group}>
        <View style={styles.tiles}>
          {[0, 1, 2].map((index) => (
            <Tile key={index} cue={cue} index={index} />
          ))}
        </View>
        <StageText style={[Type.footnote, { color: colors.textSecondary }]}>
          {t("onboarding.story.examShare.course")}
        </StageText>
        <StageText
          style={[Type.footnote, styles.strong, { color: colors.text }]}
        >
          {t("onboarding.story.examShare.courseMax")}
        </StageText>
      </View>
      <Animated.View style={[styles.group, blockStyle]}>
        <View style={[styles.blockClip, { height: 2 * UNIT }]}>
          <Animated.View
            style={[
              styles.block,
              { backgroundColor: colors.accent, height: 2 * UNIT },
              riseStyle,
            ]}
          >
            <Animated.View style={examTextStyle}>
              <StageText
                style={[NumberType.value, { color: colors.accentForeground }]}
              >
                60
              </StageText>
            </Animated.View>
          </Animated.View>
        </View>
        <StageText style={[Type.footnote, { color: colors.textSecondary }]}>
          {t("onboarding.story.examShare.exam")}
        </StageText>
        <StageText
          style={[Type.footnote, styles.strong, { color: colors.text }]}
        >
          {t("onboarding.story.examShare.examMax")}
        </StageText>
      </Animated.View>
    </View>
  );
};

const Tile = ({ cue, index }: { cue: Cue; index: number }) => {
  const colors = useThemeStore((state) => state.colors);
  const pop = useCue(cue, 0, 1, TILES_AT + index * 90, 520, "land");
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 2),
    transform: [{ scale: 0.9 + 0.1 * pop.value }],
  }));
  return (
    <Animated.View
      style={[styles.tile, { backgroundColor: colors.fill }, style]}
    >
      <StageText style={[NumberType.small, { color: colors.textSecondary }]}>
        30
      </StageText>
    </Animated.View>
  );
};

const ListHead = ({ cue }: { cue: Cue }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const shown = useCue(cue, 0, 1, LIST_AT - 100, 360, "ease");
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));
  return (
    <Animated.View style={[styles.listHead, style]}>
      <StageText style={[Type.footnote, { color: colors.textSecondary }]}>
        {t("onboarding.story.examShare.examSubject")}
      </StageText>
    </Animated.View>
  );
};

const SubjectCheck = ({
  cue,
  name,
  catalogKey,
  delay,
  rowDelay,
}: {
  cue: Cue;
  name: string;
  catalogKey: string;
  delay: number;
  rowDelay: number;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const row = useCue(cue, 0, 1, rowDelay, 420, "ease");
  const check = useCue(cue, 0, 1, delay, 460, "land");
  const rowStyle = useAnimatedStyle(() => ({
    opacity: row.value,
    transform: [{ translateY: 8 * (1 - row.value) }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, check.value * 2),
    transform: [{ scale: 0.6 + 0.4 * check.value }],
  }));
  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <SubjectAvatar {...demoSubject(catalogKey)} size={26} />
      <View style={styles.rowName}>
        <StageText style={[Type.body, { color: colors.text }]}>
          {name}
        </StageText>
      </View>
      <Animated.View style={checkStyle}>
        <Icon icon={Check} size={24} color={colors.accent} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  barLabels: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: BAR_H,
    borderRadius: BAR_H / 2,
    overflow: "hidden",
  },
  segment: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  compare: {
    position: "absolute",
    left: 0,
    right: 0,
    height: COMPARE_H,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 28,
  },
  group: {
    alignItems: "center",
    gap: 2,
  },
  tiles: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: TILE_GAP,
    marginBottom: 6,
  },
  tile: {
    width: TILE_W,
    height: UNIT,
    borderRadius: Radius.badge,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  blockClip: {
    width: TILE_W + 8,
    justifyContent: "flex-end",
    overflow: "hidden",
    borderRadius: Radius.badge,
    borderCurve: "continuous",
    marginBottom: 6,
  },
  block: {
    width: "100%",
    borderRadius: Radius.badge,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  strong: {
    fontWeight: "600",
  },
  list: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  listHead: {
    height: 20,
    paddingHorizontal: 4,
  },
  row: {
    height: ROW_H,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  rowName: {
    flex: 1,
  },
});
