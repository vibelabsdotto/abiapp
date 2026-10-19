// Native header of every modal: title, "Abbrechen" left and the primary
// action right ("Sichern" by default, `variant="done"`), or a single
// "Fertig" for read-only screens. Real UIBarButtonItems through
// Stack.Toolbar (Liquid Glass on iOS 26+), the same on every modal.
// Android renders AndroidModalHeader (text-only toolbar items are dropped
// there).

import React from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

import { useTranslation } from "@locales/index";

import { AndroidModalHeader } from "./AndroidModalHeader";

export interface ModalHeaderProps {
  title: string;
  /** Left "Abbrechen". */
  onCancel?: () => void;
  /** Right primary action, "Sichern" unless `saveLabel` says otherwise. */
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  /** Right "Fertig" for screens without anything to save. */
  onDone?: () => void;
}

export const ModalHeader = (props: ModalHeaderProps) =>
  Platform.OS === "android" ? (
    <AndroidModalHeader {...props} />
  ) : (
    <IosModalHeader {...props} />
  );

const IosModalHeader = ({
  title,
  onCancel,
  onSave,
  saveLabel,
  saveDisabled = false,
  onDone,
}: ModalHeaderProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title, headerBackVisible: false }} />
      {onCancel ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button onPress={onCancel}>
            {t("common.cancel")}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      {onSave ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            variant="done"
            disabled={saveDisabled}
            onPress={onSave}
          >
            {saveLabel ?? t("common.save")}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : onDone ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button variant="done" onPress={onDone}>
            {t("common.done")}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
    </>
  );
};
