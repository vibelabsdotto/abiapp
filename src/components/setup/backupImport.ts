// Backup import with native confirmation, shared by settings and the
// welcome screen ("Backup wiederherstellen" on a new phone).

import { Alert } from "react-native";

import { listStates } from "@domain/index";
import { t, type LanguageCode } from "@locales/index";
import { pickBackupFile, restoreBackup } from "@services/backup/backupService";
import { useProfileStore } from "@stores/profileStore";

import { confirmAsync, showError, showSuccess } from "./setupUi";

/**
 * Picks a backup file, shows what it contains, replaces all data after
 * confirmation. Returns true when the data was replaced.
 */
export async function importBackupInteractive(
  language: LanguageCode,
): Promise<boolean> {
  try {
    const picked = await pickBackupFile();
    if (picked.canceled) return false;
    const { result } = picked;
    if (!result.ok) {
      Alert.alert(
        t("settings.importInvalid"),
        result.errors
          .slice(0, 3)
          .map((error) => error.message)
          .join("\n"),
      );
      return false;
    }
    const { summary } = result;
    const backupState = listStates().find(
      (state) => state.code === summary.state,
    );
    const confirmed = await confirmAsync({
      title: t("settings.importTitle"),
      message: t("settings.importMessage", {
        date: new Date(summary.exportedAt).toLocaleString(
          language === "de" ? "de-DE" : "en-US",
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
    if (!confirmed) return false;
    await restoreBackup(result.backup);
    // A backup taken mid-onboarding still opens the app with its data.
    const profile = useProfileStore.getState();
    if (profile.profile && profile.profile.onboardingCompletedAt === null) {
      await profile.completeOnboarding();
    }
    showSuccess(t("settings.importDone"));
    return true;
  } catch (error) {
    showError(t("settings.importFailed"), error);
    return false;
  }
}
