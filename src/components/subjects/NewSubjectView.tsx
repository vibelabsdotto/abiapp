// New subject (subject-editor without subjectId): pick any number of
// catalog subjects of the state that are not added yet (grouped by
// Aufgabenfeld), or create a custom subject with field, tags and level.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Check, CirclePlus } from "lucide-react-native";
import Toast from "react-native-toast-message";

import {
  Icon,
  ListRow,
  Section,
  SegmentedControl,
  SubjectAvatar,
} from "@components/ui";
import type {
  CourseLevel,
  RulesetSummary,
  SubjectField,
  SubjectTag,
} from "@domain/model";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

import { savedFeedback, showError } from "./actions";
import { ChoiceChips, EditorScroll, FormTextInput } from "./form";
import { ModalHeader } from "./headers";
import { FIELD_ORDER, TAGS_BY_FIELD, suggestFromName } from "./subjectSuggest";
import { useEditorClose } from "./useEditorClose";

export const levelLabel = (
  ruleset: RulesetSummary | null,
  level: CourseLevel,
): string => {
  const names = ruleset?.levelNames[level];
  if (!names) return level === "elevated" ? "eA" : "gA";
  const name = names.name.charAt(0).toUpperCase() + names.name.slice(1);
  return name.length <= 16 ? name : names.short;
};

interface NewSubjectViewProps {
  ruleset: RulesetSummary | null;
}

export const NewSubjectView = ({ ruleset }: NewSubjectViewProps) => {
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  return mode === "catalog" ? (
    <CatalogPicker ruleset={ruleset} onCustom={() => setMode("custom")} />
  ) : (
    <CustomSubjectForm ruleset={ruleset} />
  );
};

const CatalogPicker = ({
  ruleset,
  onCustom,
}: {
  ruleset: RulesetSummary | null;
  onCustom: () => void;
}) => {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const subjects = useCourseStore((state) => state.subjects);
  const addCatalogSubjects = useCourseStore(
    (state) => state.addCatalogSubjects,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const close = useEditorClose(selected.length > 0 && !saving);

  const groups = useMemo(() => {
    const existing = new Set(subjects.map((subject) => subject.catalogKey));
    const open = (ruleset?.catalog ?? []).filter(
      (entry) => !existing.has(entry.key),
    );
    return FIELD_ORDER.map((field) => ({
      field,
      entries: open.filter((entry) => entry.field === field),
    })).filter((group) => group.entries.length > 0);
  }, [ruleset, subjects]);

  const toggle = (key: string) =>
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );

  const save = async () => {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    try {
      const created = await addCatalogSubjects(selected);
      savedFeedback();
      Toast.show({
        type: "success",
        text1: t("subjects.subjectEditor.added", { count: created.length }),
      });
      close(true);
    } catch (error) {
      setSaving(false);
      showError(error);
    }
  };

  const stateName = ruleset?.stateName ?? "";

  return (
    <>
      <ModalHeader
        title={t("subjects.subjectEditor.titleNew")}
        onCancel={() => close()}
        onSave={() => void save()}
        saveLabel={
          selected.length > 0
            ? `${t("subjects.subjectEditor.add")} (${selected.length})`
            : t("subjects.subjectEditor.add")
        }
        saveDisabled={selected.length === 0 || saving}
      />
      <EditorScroll>
        <Section separatorInset={60}>
          <ListRow
            title={t("subjects.subjectEditor.customRow")}
            subtitle={t("subjects.subjectEditor.customRowHint")}
            leading={
              <View
                style={[styles.plus, { backgroundColor: colors.accentLight }]}
              >
                <Icon
                  sf="plus"
                  fallback={CirclePlus}
                  size={18}
                  color={colors.accent}
                />
              </View>
            }
            chevron
            onPress={onCustom}
          />
        </Section>

        {groups.length === 0 ? (
          <Text
            style={[Type.subhead, styles.note, { color: colors.textSecondary }]}
          >
            {t("subjects.subjectEditor.allAdded", { state: stateName })}
          </Text>
        ) : (
          groups.map((group, index) => (
            <Section
              key={group.field}
              title={t(`subjects.fields.${group.field}`)}
              separatorInset={60}
              footer={
                index === groups.length - 1
                  ? t("subjects.subjectEditor.catalogFooter")
                  : undefined
              }
            >
              {group.entries.map((entry) => {
                const isOn = selected.includes(entry.key);
                return (
                  <ListRow
                    key={entry.key}
                    title={entry.name}
                    leading={<SubjectAvatar catalogKey={entry.key} size={32} />}
                    trailing={
                      isOn ? (
                        <Icon
                          sf="checkmark"
                          fallback={Check}
                          size={18}
                          weight="bold"
                          color={colors.accent}
                        />
                      ) : (
                        <View style={styles.checkSpace} />
                      )
                    }
                    onPress={() => toggle(entry.key)}
                    accessibilityLabel={entry.name}
                    accessibilityHint={undefined}
                  />
                );
              })}
            </Section>
          ))
        )}
      </EditorScroll>
    </>
  );
};

const CustomSubjectForm = ({ ruleset }: { ruleset: RulesetSummary | null }) => {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const addSubject = useCourseStore((state) => state.addSubject);
  const [name, setName] = useState("");
  const [field, setField] = useState<SubjectField>("other");
  const [tags, setTags] = useState<SubjectTag[]>(["other"]);
  const [level, setLevel] = useState<CourseLevel>("basic");
  const [touched, setTouched] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [saving, setSaving] = useState(false);
  const close = useEditorClose(name.trim().length > 0 && !saving);

  const changeName = (text: string) => {
    setName(text);
    if (touched) return;
    const suggestion = suggestFromName(text);
    if (suggestion) {
      setField(suggestion.field);
      setTags(suggestion.tags);
      setSuggested(true);
    } else if (suggested) {
      setField("other");
      setTags(["other"]);
      setSuggested(false);
    }
  };

  const pickField = (next: SubjectField) => {
    setTouched(true);
    setSuggested(false);
    setField(next);
    setTags([TAGS_BY_FIELD[next][0]]);
  };

  const toggleTag = (tag: string) => {
    setTouched(true);
    setSuggested(false);
    setTags((current) =>
      current.includes(tag as SubjectTag)
        ? current.filter((item) => item !== tag)
        : [...current, tag as SubjectTag],
    );
  };

  const valid = name.trim().length > 0 && tags.length > 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await addSubject({
        catalogKey: null,
        name: name.trim(),
        field,
        tags,
        level,
      });
      savedFeedback();
      Toast.show({
        type: "success",
        text1: t("subjects.subjectEditor.added", { count: 1 }),
      });
      close(true);
    } catch (error) {
      setSaving(false);
      showError(error);
    }
  };

  const tagOptions = [
    ...new Set<SubjectTag>([...TAGS_BY_FIELD[field], ...tags]),
  ].map((tag) => ({ value: tag, label: t(`subjects.tags.${tag}`) }));

  return (
    <>
      <ModalHeader
        title={t("subjects.subjectEditor.titleCustom")}
        onCancel={() => close()}
        onSave={() => void save()}
        saveLabel={t("subjects.subjectEditor.add")}
        saveDisabled={!valid || saving}
      />
      <EditorScroll>
        <Section title={t("subjects.subjectEditor.name")}>
          <FormTextInput
            value={name}
            onChangeText={changeName}
            placeholder={t("subjects.subjectEditor.namePlaceholder")}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={60}
            accessibilityLabel={t("subjects.subjectEditor.name")}
          />
        </Section>

        <Section
          title={t("subjects.subjectEditor.field")}
          footer={suggested ? t("subjects.subjectEditor.suggested") : undefined}
        >
          {FIELD_ORDER.map((item) => (
            <ListRow
              key={item}
              title={t(`subjects.fields.${item}`)}
              trailing={
                item === field ? (
                  <Icon
                    sf="checkmark"
                    fallback={Check}
                    size={18}
                    weight="bold"
                    color={colors.accent}
                  />
                ) : (
                  <View style={styles.checkSpace} />
                )
              }
              onPress={() => pickField(item)}
            />
          ))}
        </Section>

        <View style={styles.block}>
          <Text
            accessibilityRole="header"
            style={[Type.title3, styles.heading, { color: colors.text }]}
          >
            {t("subjects.subjectEditor.tags")}
          </Text>
          <ChoiceChips
            options={tagOptions}
            selected={(value) => tags.includes(value as SubjectTag)}
            onToggle={toggleTag}
          />
          <Text
            style={[
              Type.footnote,
              styles.note,
              {
                color: tags.length === 0 ? colors.error : colors.textSecondary,
              },
            ]}
          >
            {tags.length === 0
              ? t("subjects.subjectEditor.tagsRequired")
              : t("subjects.subjectEditor.tagsFooter")}
          </Text>
        </View>

        <View style={styles.block}>
          <Text
            accessibilityRole="header"
            style={[Type.title3, styles.heading, { color: colors.text }]}
          >
            {t("subjects.subjectEditor.level")}
          </Text>
          <SegmentedControl<CourseLevel>
            options={[
              { value: "basic", label: levelLabel(ruleset, "basic") },
              { value: "elevated", label: levelLabel(ruleset, "elevated") },
            ]}
            value={level}
            onChange={setLevel}
          />
        </View>
      </EditorScroll>
    </>
  );
};

const styles = StyleSheet.create({
  plus: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  checkSpace: {
    width: 18,
  },
  note: {
    paddingHorizontal: 4,
  },
  block: {
    gap: 10,
  },
  heading: {
    paddingHorizontal: 4,
  },
});
