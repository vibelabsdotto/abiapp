// Block I inclusion overrides: set one course, reset all. After a change a
// toast shows the recalculated Block I points so the effect is visible.

import { Alert } from "react-native";
import * as Haptics from "expo-haptics";

import { t } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";
import { evaluateCached } from "@stores/engineInput";
import { getEngineInputSnapshot } from "@stores/setupActions";

import { formatDelta } from "@components/overview/data";
import { showError, showInfo } from "@components/overview/feedback";

import type { Inclusion } from "./matrix";

/** Block I points of the stored data (shares the screen's cached result). */
function blockIPointsNow(): number | null {
  const input = getEngineInputSnapshot();
  return input ? (evaluateCached(input).value?.blockI.points ?? null) : null;
}

function announce(before: number | null): void {
  const after = blockIPointsNow();
  if (after === null) return;
  if (before === null || before === after) {
    showInfo(t("abitur.blockI.unchanged", { points: after }));
    return;
  }
  showInfo(
    t("abitur.blockI.changed", {
      points: after,
      delta: formatDelta(after - before),
    }),
  );
}

export async function setCourseInclusion(
  subjectId: string,
  halfYear: number,
  inclusion: Inclusion,
): Promise<void> {
  const before = blockIPointsNow();
  try {
    void Haptics.selectionAsync();
    await useCourseStore
      .getState()
      .setInclusion(subjectId, halfYear, inclusion);
    announce(before);
  } catch (error) {
    showError(t("editor.saveFailed"), error);
  }
}

export function confirmResetInclusions(
  overrides: { subjectId: string; halfYear: number }[],
): void {
  if (overrides.length === 0) return;
  Alert.alert(t("abitur.blockI.resetTitle"), t("abitur.blockI.resetMessage"), [
    { text: t("editor.cancel"), style: "cancel" },
    {
      text: t("abitur.blockI.resetConfirm"),
      style: "destructive",
      onPress: () => {
        void (async () => {
          const before = blockIPointsNow();
          try {
            await useCourseStore.getState().resetInclusions(overrides);
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            const after = blockIPointsNow();
            showInfo(
              t("abitur.blockI.resetDone"),
              after === null
                ? undefined
                : before !== null && before !== after
                  ? t("abitur.blockI.changed", {
                      points: after,
                      delta: formatDelta(after - before),
                    })
                  : t("abitur.blockI.unchanged", { points: after }),
            );
          } catch (error) {
            showError(t("editor.saveFailed"), error);
          }
        })();
      },
    },
  ]);
}
