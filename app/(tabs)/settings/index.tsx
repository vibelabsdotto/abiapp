// Settings tab: profile and setup flows, goal, appearance, data (backup,
// import, delete all), feedback, about and, in dev builds, developer tools.
// Every menu carries SF Symbols (NativeMenu adapter); destructive actions
// ask natively first.

import React, { useCallback, useMemo } from "react";
import { Alert, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import * as Application from "expo-application";
import * as StoreReview from "expo-store-review";
import {
  ArrowUpWideNarrow,
  BookOpenText,
  Calendar,
  ChevronsUpDown,
  CodeXml,
  Download,
  FileText,
  GraduationCap,
  Hand,
  Info,
  Languages,
  Lightbulb,
  ListOrdered,
  Map as MapIcon,
  Palette,
  RotateCcw,
  ScrollText,
  Star,
  SunMoon,
  Target,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react-native";

import {
  NativeMenu,
  type NativeMenuAction,
} from "@components/common/NativeMenu";
import { ScreenLayout } from "@components/common/ScreenLayout";
import { SettingsIcon } from "@components/settings/SettingsIcon";
import type { MenuSymbol } from "@constants/menuIcons";
import {
  confirmAsync,
  elevatedPlural,
  isProvisional,
  shortLabel,
  showError,
  showSuccess,
} from "@components/setup";
import {
  Chip,
  IssueBanner,
  ListRow,
  Section,
  formatGrade,
} from "@components/ui";
import { isFeaturamaConfigured } from "@constants/config";
import { listStates } from "@domain/index";
import type { StateCode } from "@domain/model";
import { useSetupIssues } from "@hooks/useEvaluation";
import { examVariantOf, useRuleset } from "@hooks/useRuleset";
import { useProfileDraft } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";
import {
  deleteAllData,
  exportBackup,
  pickBackupFile,
  restoreBackup,
} from "@services/backup/backupService";
import { seedDemoData } from "@services/demo/demoData";
import { useCourseStore } from "@stores/courseStore";
import { componentNeedsSubject } from "@stores/domainAccess";
import { useLanguageStore } from "@stores/languageStore";
import { useProfileStore } from "@stores/profileStore";
import { useThemeStore } from "@stores/themeStore";
import { ThemeMode, type LanguageMode } from "@apptypes/enums";

const GITHUB_URL = "https://github.com/vibelabsdotto/abiapp";
const PRIVACY_URL = "https://vibelabs.to/de/privacy";
const IMPRINT_URL = "https://vibelabs.to/de/imprint";
const APP_STORE_REVIEW_URL =
  "https://apps.apple.com/app/id6450996587?action=write-review";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.max.mannstein.abisax";

const THEME_ICONS: Record<ThemeMode, MenuSymbol> = {
  [ThemeMode.System]: "circle.lefthalf.filled",
  [ThemeMode.Light]: "sun.max",
  [ThemeMode.Dark]: "moon",
};

const THEME_LABEL_KEYS: Record<ThemeMode, string> = {
  [ThemeMode.System]: "settings.themeSystem",
  [ThemeMode.Light]: "settings.themeLight",
  [ThemeMode.Dark]: "settings.themeDark",
};

const LANGUAGE_ICONS: Record<LanguageMode, MenuSymbol> = {
  system: "globe",
  de: "d.circle",
  en: "e.circle",
};

const LANGUAGE_LABEL_KEYS: Record<LanguageMode, string> = {
  system: "settings.languageSystem",
  de: "settings.languageGerman",
  en: "settings.languageEnglish",
};

const isThemeMode = (id: string): id is ThemeMode =>
  (Object.values(ThemeMode) as string[]).includes(id);

const isLanguageMode = (id: string): id is LanguageMode =>
  id === "system" || id === "de" || id === "en";

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const languageMode = useLanguageStore((state) => state.languageMode);
  const setLanguageMode = useLanguageStore((state) => state.setLanguageMode);
  const profile = useProfileStore((state) => state.profile);
  const subjects = useCourseStore((state) => state.subjects);
  const { ruleset } = useRuleset();
  const { issues } = useSetupIssues();

  const states = useMemo(() => listStates(), []);
  const stateName =
    states.find((state) => state.code === profile?.state)?.name ?? "–";

  const variant =
    ruleset?.examVariants.find((item) => item.id === profile?.examVariantId) ??
    null;
  const required = examVariantOf(
    ruleset,
    profile?.examVariantId,
  )?.components.filter(componentNeedsSubject);
  const examCount = subjects.filter((subject) => subject.examSlot).length;
  const elevated = subjects.filter((subject) => subject.level === "elevated");

  // Setup problems (wrong LK count, exam subjects) link to their flow.
  const setupIssue = issues.find(
    (issue) =>
      issue.severity !== "info" &&
      (issue.code.startsWith("setup.") || issue.code.startsWith("exam.")),
  );

  const themeActions: NativeMenuAction[] = Object.values(ThemeMode).map(
    (mode) => ({
      id: mode,
      title: t(THEME_LABEL_KEYS[mode]),
      image: THEME_ICONS[mode],
      state: mode === themeMode ? "on" : "off",
    }),
  );

  const languageActions: NativeMenuAction[] = (
    ["system", "de", "en"] as const
  ).map((mode) => ({
    id: mode,
    title: t(LANGUAGE_LABEL_KEYS[mode]),
    image: LANGUAGE_ICONS[mode],
    state: mode === languageMode ? "on" : "off",
  }));

  const demoActions = useMemo<NativeMenuAction[]>(
    () =>
      states.map((state) => ({
        id: state.code,
        title: state.name,
        image: "mappin.and.ellipse",
        state: state.code === profile?.state ? "on" : "off",
      })),
    [profile?.state, states],
  );

  const openProfile = useCallback(() => {
    useProfileDraft.getState().initFrom(useProfileStore.getState().profile);
    router.push("/setup/profile");
  }, [router]);

  const open = useCallback((href: Href) => router.push(href), [router]);

  const openUrl = useCallback(
    async (url: string) => {
      try {
        await Linking.openURL(url);
      } catch (error) {
        showError(t("settings.linkFailed"), error);
      }
    },
    [t],
  );

  const handleExport = async () => {
    try {
      await exportBackup();
    } catch (error) {
      showError(t("settings.exportFailed"), error);
    }
  };

  const handleImport = async () => {
    try {
      const picked = await pickBackupFile();
      if (picked.canceled) return;
      const { result } = picked;
      if (!result.ok) {
        Alert.alert(
          t("settings.importInvalid"),
          result.errors
            .slice(0, 3)
            .map((error) => error.message)
            .join("\n"),
        );
        return;
      }
      const { summary } = result;
      const backupState = states.find((state) => state.code === summary.state);
      const confirmed = await confirmAsync({
        title: t("settings.importTitle"),
        message: t("settings.importMessage", {
          date: new Date(summary.exportedAt).toLocaleString(
            locale === "de" ? "de-DE" : "en-US",
            { dateStyle: "medium", timeStyle: "short" },
          ),
          profile: backupState
            ? `${backupState.name} · ${summary.abiturYear ?? ""}`
            : t("settings.importNoProfile"),
          subjects: summary.subjects,
          grades: summary.grades,
          official: summary.officialResults,
          exams: summary.examResults,
        }),
        confirm: t("settings.importConfirm"),
        destructive: true,
      });
      if (!confirmed) return;
      await restoreBackup(result.backup);
      showSuccess(t("settings.importDone"));
    } catch (error) {
      showError(t("settings.importFailed"), error);
    }
  };

  const handleDeleteAll = async () => {
    const first = await confirmAsync({
      title: t("settings.deleteTitle"),
      message: t("settings.deleteMessage"),
      confirm: t("settings.deleteConfirm"),
      destructive: true,
    });
    if (!first) return;
    const second = await confirmAsync({
      title: t("settings.deleteFinalTitle"),
      message: t("settings.deleteFinalMessage"),
      confirm: t("settings.deleteFinalConfirm"),
      destructive: true,
    });
    if (!second) return;
    try {
      await deleteAllData();
      useProfileDraft.getState().reset();
      showSuccess(t("settings.deleteDone"));
    } catch (error) {
      showError(t("settings.deleteAll"), error);
    }
  };

  const handleRate = async () => {
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
        return;
      }
    } catch {
      // Fall through to the store page.
    }
    await openUrl(
      Platform.OS === "ios" ? APP_STORE_REVIEW_URL : PLAY_STORE_URL,
    );
  };

  const handleSeed = async (code: string) => {
    const state = states.find((item) => item.code === code);
    if (!state) return;
    try {
      await seedDemoData({
        state: state.code as StateCode,
        abiturYear: profile?.abiturYear ?? 2027,
      });
      showSuccess(t("settings.seedDemoDone", { state: state.name }));
    } catch (error) {
      showError(t("settings.seedDemoFailed"), error);
    }
  };

  const handleResetOnboarding = async () => {
    try {
      await useProfileStore.getState().resetOnboarding();
    } catch (error) {
      showError(t("settings.resetOnboarding"), error);
    }
  };

  const version = `${Application.nativeApplicationVersion ?? "–"} (${
    Application.nativeBuildVersion ?? "–"
  })`;

  const pickerValue = (label: string) => (
    <View style={styles.pickerValue}>
      <Text
        style={[styles.valueText, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <ChevronsUpDown size={16} color={colors.textSecondary} />
    </View>
  );

  const elevatedTitle = elevatedPlural(ruleset, locale);

  return (
    <ScreenLayout contentContainerStyle={styles.content}>
      {profile ? (
        <Section title={t("settings.profile")} separatorInset={48}>
          <ListRow
            title={t("settings.state")}
            value={stateName}
            valueMaxWidth="62%"
            leading={<SettingsIcon icon={MapIcon} />}
            chevron
            onPress={openProfile}
          />
          <ListRow
            title={t("settings.abiturYear")}
            value={String(profile.abiturYear)}
            leading={<SettingsIcon icon={Calendar} />}
            chevron
            onPress={openProfile}
          />
          <ListRow
            title={t("settings.ruleset")}
            subtitle={ruleset?.label ?? profile.rulesetId}
            badges={
              ruleset && isProvisional(ruleset) ? (
                <Chip label={t("settings.draft")} tone="warning" />
              ) : undefined
            }
            leading={<SettingsIcon icon={ScrollText} />}
            chevron
            onPress={openProfile}
          />
          {ruleset && ruleset.examVariants.length > 1 ? (
            <ListRow
              title={t("settings.examVariant")}
              subtitle={variant?.label ?? t("settings.notSet")}
              leading={<SettingsIcon icon={ListOrdered} />}
              chevron
              onPress={() => open("/setup/exams")}
            />
          ) : null}
          <ListRow
            title={t("settings.subjects")}
            value={t("settings.subjectsCount", { count: subjects.length })}
            leading={<SettingsIcon icon={BookOpenText} />}
            chevron
            onPress={() => open("/setup/subjects")}
          />
          <ListRow
            title={elevatedTitle}
            value={
              elevated.length > 0
                ? elevated.map((subject) => shortLabel(subject)).join(", ")
                : t("settings.notSet")
            }
            valueMaxWidth="55%"
            leading={<SettingsIcon icon={ArrowUpWideNarrow} />}
            chevron
            onPress={() => open("/setup/levels")}
          />
          <ListRow
            title={t("settings.exams")}
            value={t("settings.examsCount", {
              count: examCount,
              total: required?.length ?? 0,
            })}
            leading={<SettingsIcon icon={GraduationCap} />}
            chevron
            onPress={() => open("/setup/exams")}
          />
        </Section>
      ) : null}
      {setupIssue ? (
        <IssueBanner
          severity={setupIssue.severity}
          message={setupIssue.message}
          onPress={() =>
            open(
              setupIssue.code.startsWith("exam.")
                ? "/setup/exams"
                : "/setup/levels",
            )
          }
        />
      ) : null}

      {profile ? (
        <Section
          title={t("settings.goal")}
          footer={t("settings.goalFooter")}
          separatorInset={48}
        >
          <ListRow
            title={t("settings.goalRow")}
            value={
              profile.targetTenths !== null
                ? formatGrade(profile.targetTenths, locale)
                : t("settings.notSet")
            }
            leading={<SettingsIcon icon={Target} />}
            chevron
            onPress={() => open("/goal-editor")}
          />
        </Section>
      ) : null}

      <Section title={t("settings.appearance")} separatorInset={48}>
        <NativeMenu
          title={t("settings.chooseTheme")}
          actions={themeActions}
          onSelect={(id) => {
            if (isThemeMode(id)) setThemeMode(id);
          }}
          fullWidth
          trigger={
            <ListRow
              title={t("settings.theme")}
              accessibilityLabel={`${t("settings.theme")}, ${t(THEME_LABEL_KEYS[themeMode])}`}
              leading={<SettingsIcon icon={SunMoon} />}
              trailing={pickerValue(t(THEME_LABEL_KEYS[themeMode]))}
            />
          }
        />
        <NativeMenu
          title={t("settings.chooseLanguage")}
          actions={languageActions}
          onSelect={(id) => {
            if (isLanguageMode(id)) setLanguageMode(id);
          }}
          fullWidth
          trigger={
            <ListRow
              title={t("settings.language")}
              accessibilityLabel={`${t("settings.language")}, ${t(LANGUAGE_LABEL_KEYS[languageMode])}`}
              leading={<SettingsIcon icon={Languages} />}
              trailing={pickerValue(t(LANGUAGE_LABEL_KEYS[languageMode]))}
            />
          }
        />
      </Section>

      <Section
        title={t("settings.data")}
        footer={t("settings.dataFooter")}
        separatorInset={48}
      >
        <ListRow
          title={t("settings.exportBackup")}
          leading={<SettingsIcon icon={Upload} />}
          onPress={() => void handleExport()}
        />
        <ListRow
          title={t("settings.importBackup")}
          leading={<SettingsIcon icon={Download} />}
          onPress={() => void handleImport()}
        />
        <ListRow
          title={t("settings.deleteAll")}
          destructive
          leading={<SettingsIcon icon={Trash2} tone="destructive" />}
          onPress={() => void handleDeleteAll()}
        />
      </Section>

      <Section title={t("settings.feedback")} separatorInset={48}>
        {isFeaturamaConfigured ? (
          <ListRow
            title={t("settings.featureRequests")}
            leading={<SettingsIcon icon={Lightbulb} />}
            chevron
            onPress={() => open("/feature-requests")}
          />
        ) : null}
        <ListRow
          title={t("settings.rate")}
          leading={<SettingsIcon icon={Star} />}
          onPress={() => void handleRate()}
        />
      </Section>

      <Section title={t("settings.about")} separatorInset={48}>
        <ListRow
          title={t("settings.openSource")}
          leading={<SettingsIcon icon={CodeXml} />}
          chevron
          onPress={() => void openUrl(GITHUB_URL)}
        />
        <ListRow
          title={t("settings.privacyPolicy")}
          leading={<SettingsIcon icon={Hand} />}
          chevron
          onPress={() => void openUrl(PRIVACY_URL)}
        />
        <ListRow
          title={t("settings.imprint")}
          leading={<SettingsIcon icon={FileText} />}
          chevron
          onPress={() => void openUrl(IMPRINT_URL)}
        />
        <ListRow
          title={t("settings.version")}
          value={version}
          leading={<SettingsIcon icon={Info} />}
        />
      </Section>

      {__DEV__ ? (
        <Section
          title={t("settings.developer")}
          footer={t("settings.developerFooter")}
          separatorInset={48}
        >
          <NativeMenu
            title={t("settings.seedDemoFor")}
            actions={demoActions}
            onSelect={(id) => void handleSeed(id)}
            fullWidth
            trigger={
              <ListRow
                title={t("settings.seedDemo")}
                leading={<SettingsIcon icon={WandSparkles} />}
                trailing={pickerValue(profile?.state ?? "SN")}
              />
            }
          />
          <ListRow
            title={t("settings.resetOnboarding")}
            leading={<SettingsIcon icon={RotateCcw} />}
            onPress={() => void handleResetOnboarding()}
          />
          <ListRow
            title={t("settings.designGallery")}
            leading={<SettingsIcon icon={Palette} />}
            chevron
            onPress={() => open("/dev-gallery")}
          />
        </Section>
      ) : null}

      <View style={styles.footer}>
        <Text style={[styles.footnote, { color: colors.textSecondary }]}>
          {t("settings.disclaimer")}
        </Text>
        <Text style={[styles.footnote, { color: colors.textTertiary }]}>
          {t("settings.privacy")}
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  pickerValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "55%",
  },
  valueText: {
    fontSize: 17,
    flexShrink: 1,
  },
  footer: {
    gap: 4,
    paddingHorizontal: 16,
  },
  footnote: {
    fontSize: 13,
    textAlign: "center",
  },
});
