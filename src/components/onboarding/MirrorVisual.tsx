// The UI piece on each mirror page of the onboarding story, from the app's
// own building blocks with fixed example values. Before the state is
// chosen everything stays general (Block I/II, half-years "HJ 1"); every
// number shown here holds in all 16 states (Block I up to 600, Block II up
// to 300 of 900 points).

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BookOpenCheck,
  Code,
  FileText,
  Map,
  type LucideIcon,
} from "lucide-react-native";

import {
  Chip,
  GradeHero,
  PointsBadge,
  Icon,
  SubjectAvatar,
} from "@components/ui";
import { NumberType, Radius, Type } from "@constants/typography";
import { gradeFromPoints } from "@domain/index";
import { useReducedMotion } from "react-native-reanimated";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import type { Worry } from "@utils/onboardingStory";

import { DemoInclusion } from "./intro/IntroScreens";

const DEMO_TOTAL = 612;

/** Block I and Block II as shares of the 900 points, the exams marked. */
const BlockBar = () => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const blocks = [
    {
      key: "courses",
      title: t("onboarding.mirror.exams.courses"),
      points: 600,
      strong: false,
    },
    {
      key: "exams",
      title: t("onboarding.mirror.exams.exams"),
      points: 300,
      strong: true,
    },
  ];
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.bar}>
        {blocks.map((block) => (
          <View
            key={block.key}
            style={[
              styles.segment,
              {
                flex: block.points,
                backgroundColor: block.strong ? colors.accent : colors.fill,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.barLegend}>
        {blocks.map((block) => (
          <View key={block.key} style={styles.flex}>
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {block.title}
            </Text>
            <Text style={[NumberType.value, { color: colors.text }]}>
              {t("onboarding.mirror.exams.share", { points: block.points })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const RulesVisual = () => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const rows = [
    {
      title: t("onboarding.mirror.rules.blockI"),
      text: t("onboarding.mirror.rules.blockIText"),
      value: t("onboarding.mirror.rules.upTo", { points: 600 }),
    },
    {
      title: t("onboarding.mirror.rules.blockII"),
      text: t("onboarding.mirror.rules.blockIIText"),
      value: t("onboarding.mirror.rules.upTo", { points: 300 }),
    },
  ];
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {rows.map((row) => (
        <View key={row.title} style={styles.factRow}>
          <View style={styles.flex}>
            <Text style={[Type.headline, { color: colors.text }]}>
              {row.title}
            </Text>
            <Text style={[Type.subhead, { color: colors.textSecondary }]}>
              {row.text}
            </Text>
          </View>
          <Text style={[NumberType.value, { color: colors.text }]}>
            {row.value}
          </Text>
        </View>
      ))}
      <View style={[styles.divider, { backgroundColor: colors.separator }]} />
      <View style={styles.factRow}>
        <Text style={[Type.headline, styles.flex, { color: colors.text }]}>
          {t("onboarding.mirror.rules.total")}
        </Text>
        <Text style={[NumberType.title, { color: colors.accent }]}>900</Text>
      </View>
    </View>
  );
};

const FOCUS_ROWS = [
  {
    name: "maths",
    color: "slate",
    values: [11, 12, 13, 12],
    counted: [true, true, true, true],
    chip: "full",
  },
  {
    name: "history",
    color: "orange",
    values: [7, 8, 11, 10],
    counted: [false, false, true, true],
    chip: "relaxed",
  },
] as const;

const FocusVisual = () => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {FOCUS_ROWS.map((row) => (
        <View key={row.name} style={styles.focusRow}>
          <View style={styles.focusHead}>
            <SubjectAvatar
              name={t(`onboarding.demo.${row.name}`)}
              color={row.color}
              size={28}
            />
            <Text
              numberOfLines={1}
              style={[Type.headline, styles.flex, { color: colors.text }]}
            >
              {t(`onboarding.demo.${row.name}`)}
            </Text>
            <Chip
              label={t(`onboarding.mirror.focus.${row.chip}`)}
              tone={row.chip === "full" ? "success" : "neutral"}
            />
          </View>
          <View style={styles.badges}>
            {row.values.map((points, index) => (
              <View
                key={index}
                style={[
                  styles.badgeCell,
                  !row.counted[index] && styles.notCounted,
                ]}
              >
                <PointsBadge points={points} size="medium" />
                <Text style={[Type.caption1, { color: colors.textSecondary }]}>
                  {t("onboarding.demo.halfYear", { index: index + 1 })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const TRUST_ROWS: { icon: LucideIcon; key: string }[] = [
  { icon: Map, key: "states" },
  { icon: FileText, key: "sources" },
  { icon: BookOpenCheck, key: "tests" },
  { icon: Code, key: "openSource" },
];

const TrustVisual = () => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {TRUST_ROWS.map((row) => (
        <View key={row.key} style={styles.trustRow}>
          <Icon icon={row.icon} size={20} color={colors.accent} />
          <Text style={[Type.body, styles.flex, { color: colors.text }]}>
            {t(`onboarding.mirror.trust.${row.key}`)}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const MirrorVisual = ({ worry }: { worry: Worry }) => {
  const reduceMotion = useReducedMotion();
  switch (worry) {
    case "rules":
      return <RulesVisual />;
    case "inclusion":
      return <DemoInclusion animate={!reduceMotion} />;
    case "focus":
      return <FocusVisual />;
    case "exams":
      return <BlockBar />;
    case "standing":
      return (
        <GradeHero
          gradeTenths={gradeFromPoints(DEMO_TOTAL).tenths}
          totalPoints={DEMO_TOTAL}
          predicted
          legend={false}
        />
      );
    case "trust":
      return <TrustVisual />;
  }
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: 16,
    gap: 14,
  },
  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  bar: {
    flexDirection: "row",
    height: 28,
    gap: 3,
  },
  segment: {
    borderRadius: Radius.badge,
    borderCurve: "continuous",
  },
  barLegend: {
    flexDirection: "row",
    gap: 12,
  },
  badges: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badgeCell: {
    alignItems: "center",
    gap: 4,
    width: "22%",
  },
  notCounted: {
    opacity: 0.32,
  },
  focusRow: {
    gap: 10,
  },
  focusHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
