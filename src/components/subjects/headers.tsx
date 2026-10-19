// Native header controls of the subjects lane.
// - ModalHeader: title plus native bar buttons "Abbrechen" (left) and the
//   prominent "Sichern" (right) via Stack.Toolbar (UIBarButtonItem on iOS).
// - HalfYearPicker: segmented half-year switcher with the ruleset labels.

import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Stack } from "expo-router";

import { SegmentedControl, SubjectAvatar } from "@components/ui";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

interface ModalHeaderProps {
  title: string;
  onCancel: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
}

export const ModalHeader = ({
  title,
  onCancel,
  onSave,
  saveLabel,
  saveDisabled = false,
}: ModalHeaderProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title, headerBackVisible: false }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={onCancel}>
          {t("subjects.common.cancel")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {onSave ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            variant="done"
            disabled={saveDisabled}
            onPress={onSave}
          >
            {saveLabel ?? t("subjects.common.save")}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
    </>
  );
};

interface HalfYearPickerProps {
  labels: string[];
  value: number;
  onChange: (halfYear: number) => void;
  style?: StyleProp<ViewStyle>;
}

export const HalfYearPicker = ({
  labels,
  value,
  onChange,
  style,
}: HalfYearPickerProps) => {
  const { t } = useTranslation();
  if (labels.length < 2) return null;
  return (
    <SegmentedControl
      options={labels.map((label, index) => ({
        value: index,
        label,
        accessibilityLabel: t("ui.halfYear", { name: label }),
      }))}
      value={value}
      onChange={onChange}
      accessibilityLabel={t("subjects.halfYearPicker")}
      style={style}
    />
  );
};

/** Which subject and half-year an editor works on (top of the modal). */
export const SubjectContext = ({
  subject,
  detail,
}: {
  subject: SubjectRecord;
  detail?: string;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.context}>
      <SubjectAvatar
        catalogKey={subject.catalogKey}
        color={subject.color}
        name={subject.name}
        tags={subject.tags}
        size={28}
      />
      <Text
        style={[Type.headline, styles.contextName, { color: colors.text }]}
        numberOfLines={1}
      >
        {subject.name}
      </Text>
      {detail ? (
        <Text style={[Type.subhead, { color: colors.textSecondary }]}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  contextName: {
    flexShrink: 1,
  },
});

/** SF Symbol only on iOS; Android toolbar items fall back to their label. */
export const toolbarIcon = <T extends string>(name: T): T | undefined =>
  Platform.OS === "ios" ? name : undefined;
