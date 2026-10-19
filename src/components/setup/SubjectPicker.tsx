// Subject choice: the ruleset catalog grouped by Aufgabenfeld (multi
// select), own subjects (custom or from another state's catalog) and an
// inline form to add a subject with name and field.

import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronsUpDown, Plus } from "lucide-react-native";

import {
  NativeMenu,
  type NativeMenuAction,
} from "@components/common/NativeMenu";
import { Icon, ListRow, Section, SubjectAvatar } from "@components/ui";
import { Type } from "@constants/typography";
import type { RulesetSummary, SubjectField } from "@domain/model";
import { FIELD_ORDER, type CustomSubjectDraft } from "@hooks/useSetupFlows";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useThemeStore } from "@stores/themeStore";

export const FIELD_SYMBOLS: Record<SubjectField, string> = {
  language: "character.book.closed",
  social: "person.3",
  science: "atom",
  religion: "book.closed",
  sport: "figure.run",
  other: "square.grid.2x2",
};

interface SubjectPickerProps {
  ruleset: RulesetSummary;
  keys: string[];
  onToggleKey: (key: string) => void;
  custom: CustomSubjectDraft[];
  onToggleCustom: (key: string) => void;
  onAddCustom: (name: string, field: SubjectField) => void;
  onRemoveCustom: (key: string) => void;
  /** Saved subjects (to mark the ones with entries). */
  subjects?: SubjectRecord[];
  withData?: Set<string>;
}

export const SubjectPicker = ({
  ruleset,
  keys,
  onToggleKey,
  custom,
  onToggleCustom,
  onAddCustom,
  onRemoveCustom,
  subjects = [],
  withData,
}: SubjectPickerProps) => {
  const { t } = useTranslation();
  const selected = useMemo(() => new Set(keys), [keys]);
  const keysWithData = useMemo(
    () =>
      new Set(
        subjects
          .filter((subject) => withData?.has(subject.id) && subject.catalogKey)
          .map((subject) => subject.catalogKey as string),
      ),
    [subjects, withData],
  );
  const groups = FIELD_ORDER.map((field) => ({
    field,
    entries: ruleset.catalog.filter((entry) => entry.field === field),
  })).filter((group) => group.entries.length > 0);
  const hasOrphans = custom.some((item) => item.orphan);

  return (
    <>
      {groups.map(({ field, entries }) => (
        <Section
          key={field}
          title={t(`setup.subjects.fields.${field}`)}
          separatorInset={60}
        >
          {entries.map((entry) => {
            const isSelected = selected.has(entry.key);
            const hasData = keysWithData.has(entry.key);
            return (
              <ListRow
                key={entry.key}
                title={entry.name}
                subtitle={hasData ? t("setup.subjects.hasData") : undefined}
                leading={<SubjectAvatar catalogKey={entry.key} size={32} />}
                selected={isSelected}
                selectionStyle="circle"
                onPress={() => onToggleKey(entry.key)}
              />
            );
          })}
        </Section>
      ))}

      <Section
        title={t("setup.subjects.custom")}
        footer={
          hasOrphans
            ? t("setup.subjects.orphanFooter", { state: ruleset.stateName })
            : t("setup.subjects.customFooter")
        }
        separatorInset={60}
      >
        {custom.map((item) => {
          const hasData = item.subjectId
            ? (withData?.has(item.subjectId) ?? false)
            : false;
          const subtitle = [
            item.orphan
              ? t("setup.subjects.orphan", { state: ruleset.stateName })
              : t(`setup.subjects.fields.${item.field}`),
            hasData ? t("setup.subjects.hasData") : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <ListRow
              key={item.key}
              title={item.name}
              subtitle={subtitle}
              leading={
                <SubjectAvatar catalogKey={null} name={item.name} size={32} />
              }
              selected={item.selected}
              selectionStyle="circle"
              onPress={() => onToggleCustom(item.key)}
              menu={
                item.subjectId === null
                  ? {
                      title: item.name,
                      actions: [
                        {
                          id: "remove",
                          title: t("setup.subjects.remove"),
                          image: "trash",
                          destructive: true,
                          onSelect: () => onRemoveCustom(item.key),
                        },
                      ],
                    }
                  : undefined
              }
            />
          );
        })}
        <CustomSubjectForm onAdd={onAddCustom} />
      </Section>
    </>
  );
};

const CustomSubjectForm = ({
  onAdd,
}: {
  onAdd: (name: string, field: SubjectField) => void;
}) => {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const [name, setName] = useState("");
  const [field, setField] = useState<SubjectField | null>(null);
  const canAdd = name.trim().length > 0 && field !== null;

  const fieldActions: NativeMenuAction[] = FIELD_ORDER.map((item) => ({
    id: item,
    title: t(`setup.subjects.fields.${item}`),
    image: FIELD_SYMBOLS[item],
    state: item === field ? "on" : "off",
  }));

  const submit = () => {
    if (!canAdd || field === null) return;
    onAdd(name, field);
    setName("");
    setField(null);
  };

  return (
    <View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("setup.subjects.customName")}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="done"
        onSubmitEditing={submit}
        autoCapitalize="words"
        style={[Type.body, styles.input, { color: colors.text }]}
        accessibilityLabel={t("setup.subjects.customName")}
      />
      <View style={[styles.separator, { backgroundColor: colors.separator }]} />
      <NativeMenu
        title={t("setup.subjects.chooseField")}
        actions={fieldActions}
        onSelect={(id) => setField(id as SubjectField)}
        fullWidth
        trigger={
          <ListRow
            title={t("setup.subjects.customField")}
            trailing={
              <View style={styles.pickerValue}>
                <Text
                  style={[
                    Type.body,
                    styles.pickerText,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {field
                    ? t(`setup.subjects.fields.${field}`)
                    : t("setup.subjects.chooseField")}
                </Text>
                <ChevronsUpDown size={16} color={colors.textSecondary} />
              </View>
            }
          />
        }
      />
      <View style={[styles.separator, { backgroundColor: colors.separator }]} />
      <Pressable
        onPress={submit}
        disabled={!canAdd}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canAdd }}
        style={({ pressed }) => [
          styles.addRow,
          pressed && { backgroundColor: colors.fill },
          !canAdd && styles.disabled,
        ]}
      >
        <Icon
          sf="plus.circle.fill"
          fallback={Plus}
          size={22}
          color={colors.accent}
        />
        <Text style={[Type.body, { color: colors.accent }]}>
          {t("setup.subjects.addCustom")}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  pickerValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "60%",
  },
  pickerText: {
    flexShrink: 1,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.45,
  },
});
