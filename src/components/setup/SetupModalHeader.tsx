// Native header of a setup modal: title, "Abbrechen" left and "Sichern"
// right as native toolbar buttons (Liquid Glass on iOS 26).

import React from "react";
import { Stack } from "expo-router";

import { useTranslation } from "@locales/index";

interface SetupModalHeaderProps {
  title: string;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled: boolean;
}

export const SetupModalHeader = ({
  title,
  onCancel,
  onSave,
  saveDisabled,
}: SetupModalHeaderProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={onCancel}>
          {t("setup.cancel")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="done"
          disabled={saveDisabled}
          onPress={onSave}
        >
          {t("setup.save")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
};
