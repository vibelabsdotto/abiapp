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

const BAR_TOP = 30;
const BAR_H = 20;
/** Height of one course term at its maximum (30 points). */
const UNIT = 50;
const TILE_W = 54;
const TILE_GAP = 6;
const COMPARE_TOP = BAR_TOP + BAR_H + 20;
/** Two course terms stacked, and the exam next to them. */
const COLUMN_H = 2 * UNIT + TILE_GAP;
const COMPARE_H = COLUMN_H + 56;
const LIST_TOP = COMPARE_TOP + COMPARE_H + 14;
const ROW_H = 46;
const SUBJECTS = [
  { name: "german", key: "de" },
  { name: "maths", key: "ma" },
  { name: "english", key: "en" },
];
/** On low screens two subjects in the list. */
const subjectsFor = (compact: boolean) =>
  compact ? SUBJECTS.slice(0, 2) : SUBJECTS;
const heightFor = (compact: boolean) =>
  LIST_TOP + 22 + subjectsFor(compact).length * ROW_H;

const COURSES_AT = 150;
const EXAMS_AT = 750;
const TILES_AT = 1350;
const TILE_STAGGER = 280;
const BLOCK_AT = 2050;
const CHECK_AT = 2850;
const CHECK_STAGGER = 260;

export const ExamShareScene = ({
  cue,
  compact,
  onReplay,
}: {
  cue: Cue;
  compact: boolean;
  onReplay: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <SceneStage
      height={heightFor(compact)}
      label={t("onboarding.story.examShare.a11y")}
      onReplay={onReplay}
    >
      {(width) => <ExamShare cue={cue} width={width} compact={compact} />}
    </SceneStage>
  );
};

const ExamShare = ({
  cue,
  width,
  compact,
}: {
  cue: Cue;
  width: number;
  compact: boolean;
}) => {
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
        <StageText style={[Type.body, { color: colors.textSecondary }]}>
          {t("onboarding.story.examShare.courses")}
          <StageText style={[NumberType.value, { color: colors.text }]}>
            {"  600"}
          </StageText>
        </StageText>
        <Animated.View style={examLabelStyle}>
          <StageText style={[Type.body, { color: colors.accent }]}>
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
        <ListHead />
        {subjectsFor(compact).map((subject, index) => (
          <SubjectCheck
            key={subject.key}
            cue={cue}
            name={t(`onboarding.demo.${subject.name}`)}
            catalogKey={subject.key}
            delay={CHECK_AT + index * CHECK_STAGGER}
          />
        ))}
      </View>
    </>
  );
};

/**
 * Two course terms at their best (30 each) stack into a column; then one
 * exam grows next to it to exactly the same height: at least twice as
 * much as a course term.
 */
const Compare = ({ cue }: { cue: Cue }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const grow = useCue(cue, 0, 1, BLOCK_AT, 620);
  // The exam rises out of the floor inside its clip, to the column height.
  const growStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: COLUMN_H * (1 - grow.value) }],
  }));
  const examTextStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (grow.value - 0.6) / 0.4),
  }));

  return (
    <View style={[styles.compare, { top: COMPARE_TOP }]}>
      <View style={styles.group}>
        <View style={[styles.column, { height: COLUMN_H }]}>
          {/* The lower term lands first, the second stacks on it. */}
          <Tile cue={cue} order={1} />
          <Tile cue={cue} order={0} />
        </View>
        <StageText style={[Type.subhead, { color: colors.textSecondary }]}>
          {t("onboarding.story.examShare.course")}
        </StageText>
        <StageText
          style={[Type.subhead, styles.strong, { color: colors.text }]}
        >
          {t("onboarding.story.examShare.courseMax")}
        </StageText>
      </View>
      <View style={styles.group}>
        <View
          style={[
            styles.blockClip,
            { height: COLUMN_H, backgroundColor: colors.gaugeTrack },
          ]}
        >
          <Animated.View
            style={[
              styles.block,
              { backgroundColor: colors.accent, height: COLUMN_H },
              growStyle,
            ]}
          >
            <Animated.View style={examTextStyle}>
              <StageText
                style={[NumberType.title, { color: colors.accentForeground }]}
              >
                60
              </StageText>
            </Animated.View>
          </Animated.View>
        </View>
        <StageText style={[Type.subhead, { color: colors.textSecondary }]}>
          {t("onboarding.story.examShare.exam")}
        </StageText>
        <StageText
          style={[Type.subhead, styles.strong, { color: colors.text }]}
        >
          {t("onboarding.story.examShare.examMax")}
        </StageText>
      </View>
    </View>
  );
};

/** One course term at its best, dropping onto the column. */
const Tile = ({ cue, order }: { cue: Cue; order: number }) => {
  const colors = useThemeStore((state) => state.colors);
  const drop = useCue(cue, 0, 1, TILES_AT + order * TILE_STAGGER, 560, "land");
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 2.5),
    transform: [{ translateY: -28 * (1 - drop.value) }],
  }));
  return (
    <Animated.View
      style={[styles.tile, { backgroundColor: colors.fill }, style]}
    >
      <StageText style={[NumberType.title, { color: colors.textSecondary }]}>
        30
      </StageText>
    </Animated.View>
  );
};

const ListHead = () => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  return (
    <Animated.View style={styles.listHead}>
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
}: {
  cue: Cue;
  name: string;
  catalogKey: string;
  delay: number;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const check = useCue(cue, 0, 1, delay, 460, "land");
  const checkStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, check.value * 2),
    transform: [{ scale: 0.6 + 0.4 * check.value }],
  }));
  return (
    <View style={styles.row}>
      <SubjectAvatar {...demoSubject(catalogKey)} size={30} />
      <View style={styles.rowName}>
        <StageText style={[Type.body, { color: colors.text }]}>
          {name}
        </StageText>
      </View>
      <Animated.View style={checkStyle}>
        <Icon icon={Check} size={24} color={colors.accent} />
      </Animated.View>
    </View>
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
  column: {
    justifyContent: "flex-end",
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
    width: TILE_W,
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
    height: 22,
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
