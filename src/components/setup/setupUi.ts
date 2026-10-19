// UI helpers shared by onboarding, the setup modals and settings: native
// confirmations as promises, the ruleset change with data-loss confirmation,
// toasts for issues and level terms from the ruleset.

import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import type { Issue, RulesetSummary } from "@domain/model";
import type { SubjectsSaveResult } from "@hooks/useSetupFlows";
import { t, type LanguageCode } from "@locales/index";
import { errorMessage } from "@stores/domainAccess";
import {
  changeRules,
  startSetup,
  type RuleChangeInput,
  type RuleChangeResult,
} from "@stores/setupActions";
import { useProfileStore } from "@stores/profileStore";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirm: string;
  cancel?: string;
  destructive?: boolean;
}

/** Native alert with cancel + confirm; resolves true on confirm. */
export const confirmAsync = ({
  title,
  message,
  confirm,
  cancel,
  destructive = false,
}: ConfirmOptions): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancel ?? t("setup.cancel"),
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: confirm,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

/** Up to `limit` issue messages as lines, plus "und n weitere". */
export const issueLines = (issues: Issue[], limit = 4): string => {
  const lines = issues.slice(0, limit).map((issue) => issue.message);
  if (issues.length > limit) {
    lines.push(t("setup.rulesChange.more", { count: issues.length - limit }));
  }
  return lines.join("\n");
};

export const showError = (title: string, error: unknown) => {
  Toast.show({ type: "error", text1: title, text2: errorMessage(error) });
};

export const showSuccess = (title: string, text?: string) => {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  Toast.show({ type: "success", text1: title, text2: text });
};

/** Non-blocking hints after a save (e.g. subject kept because of grades). */
export const showIssues = (issues: Issue[]) => {
  const relevant = issues.filter((issue) => issue.severity !== "info");
  if (relevant.length === 0) return;
  Toast.show({
    type: "warning",
    text1: relevant[0].message,
    text2:
      relevant.length > 1
        ? t("setup.rulesChange.more", { count: relevant.length - 1 })
        : undefined,
  });
};

/**
 * Creates the profile or changes state/year/version. If the change would
 * delete entries, the user confirms natively first; then the change runs
 * again with `allowDataLoss`. Returns null when the user cancelled.
 */
export async function applyRulesChange(
  input: Required<Pick<RuleChangeInput, "state" | "abiturYear">> &
    Pick<RuleChangeInput, "rulesetId">,
): Promise<RuleChangeResult | null> {
  const hasProfile = useProfileStore.getState().profile !== null;
  const first = hasProfile ? await changeRules(input) : await startSetup(input);
  if (first.applied) return first;
  const blocking = first.issues.filter((issue) => issue.severity === "error");
  const confirmed = await confirmAsync({
    title: t("setup.rulesChange.confirmTitle"),
    message: t("setup.rulesChange.confirmMessage", {
      issues: issueLines(blocking),
    }),
    confirm: t("setup.rulesChange.confirm"),
    destructive: true,
  });
  if (!confirmed) return null;
  return changeRules({ ...input, allowDataLoss: true });
}

/** Plural for the elevated level ("Leistungskurse", "eA-Fächer"). */
export const elevatedPlural = (
  ruleset: Pick<RulesetSummary, "levelNames"> | null,
  language: LanguageCode,
): string => {
  if (!ruleset) return t("setup.levels.plural", { short: "LK" });
  const { name, short } = ruleset.levelNames.elevated;
  if (language === "de") {
    const base = name.split(" (")[0];
    if (base.endsWith("kurs")) return `${base}e`;
    if (base.endsWith("fach")) return `${base.slice(0, -4)}fächer`;
  }
  return t("setup.levels.plural", { short });
};

/** "Leistungskurs (LK)" style description of a level. */
export const levelLabel = (level: { name: string; short: string }): string =>
  level.name.includes(level.short)
    ? level.name
    : `${level.name} (${level.short})`;

/**
 * Saves a subjects draft. Subjects with entries are only removed after a
 * destructive confirmation; returns false if the user kept them.
 */
export async function saveSubjectsDraft(draft: {
  removalsWithData: { name: string }[];
  save: () => Promise<SubjectsSaveResult>;
}): Promise<boolean> {
  if (draft.removalsWithData.length > 0) {
    const confirmed = await confirmAsync({
      title: t("setup.subjects.removeTitle"),
      message: t("setup.subjects.removeMessage", {
        names: draft.removalsWithData.map((subject) => subject.name).join(", "),
      }),
      confirm: t("setup.subjects.removeConfirm"),
      destructive: true,
    });
    if (!confirmed) return false;
  }
  const result = await draft.save();
  showIssues(result.issues);
  return result.saved;
}
