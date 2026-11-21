// Dev gallery: every design-system component in realistic states.
// Development builds only; open with the deep link abiapp://dev-gallery.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { CirclePlus, Target } from "lucide-react-native";

import { NativeMenu } from "@components/common/NativeMenu";
import {
  CheckRow,
  Chip,
  EmptyState,
  GradeHero,
  HalfYearStrip,
  Icon,
  IssueBanner,
  ListRow,
  PointsBadge,
  PointsPicker,
  ProgressBar,
  Section,
  SegmentedControl,
  StatTile,
  SubjectAvatar,
  SUBJECT_COLOR_KEYS,
  gradeEquivalent,
  type HalfYearValue,
  type ListRowMenu,
} from "@components/ui";
import { ScreenLayout } from "@components/common/ScreenLayout";
import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";
import { Type } from "@constants/typography";
import { ThemeMode } from "@apptypes/enums";
import type { ValueSource } from "@domain/model";

const HALF_YEARS = ["11/1", "11/2", "12/1", "12/2"] as const;

const noop = () => undefined;

const subjectMenu = (name: string): ListRowMenu => ({
  title: name,
  actions: [
    {
      id: "grade",
      title: "Note hinzufügen",
      image: "plus.circle",
      onSelect: noop,
    },
    {
      id: "result",
      title: "Halbjahresergebnis eintragen",
      image: "square.and.pencil",
      onSelect: noop,
    },
    { id: "edit", title: "Fach bearbeiten", image: "pencil", onSelect: noop },
    {
      id: "remove",
      title: "Fach entfernen",
      image: "trash",
      destructive: true,
      onSelect: noop,
    },
  ],
});

const strip = (
  values: [number | null, number | null, ValueSource][],
): HalfYearValue[] =>
  values.map(([points, exact, source], index) => ({
    label: HALF_YEARS[index] ?? "",
    points,
    exact,
    source,
  }));

export default function DevGalleryScreen() {
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const { t } = useTranslation();
  const [halfYear, setHalfYear] = useState<string>("12/1");
  const [points, setPoints] = useState<number | null>(11);

  if (!__DEV__) return <Redirect href="/" />;

  const themeMenu = (
    <NativeMenu
      title="Design"
      actions={[
        {
          id: ThemeMode.System,
          title: "System",
          image: "circle.lefthalf.filled",
          state: themeMode === ThemeMode.System ? "on" : "off",
        },
        {
          id: ThemeMode.Light,
          title: "Hell",
          image: "sun.max",
          state: themeMode === ThemeMode.Light ? "on" : "off",
        },
        {
          id: ThemeMode.Dark,
          title: "Dunkel",
          image: "moon",
          state: themeMode === ThemeMode.Dark ? "on" : "off",
        },
      ]}
      onSelect={(id) => setThemeMode(id as ThemeMode)}
      hitSlop={8}
      trigger={<Icon icon={Target} size={24} color={colors.accent} />}
    />
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t("ui.gallery.title"),
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerShadowVisible: false,
          headerRight: () => themeMenu,
        }}
      />
      <ScreenLayout contentContainerStyle={styles.content}>
        <Section title="Übersicht" variant="plain">
          <GradeHero
            gradeTenths={18}
            totalPoints={684}
            predicted
            goalTenths={15}
            goalPoints={733}
          />
          <View style={styles.tiles}>
            <StatTile
              label="Block I"
              value="412"
              unit="/600"
              caption="36 von 40 Kursen eingebracht"
              progress={{ value: 412, max: 600, markers: [200] }}
            />
            <StatTile
              label="Block II"
              value="214"
              unit="/300"
              caption="2 Prüfungen geschätzt"
              tone="accent"
              progress={{ value: 214, max: 300, markers: [100] }}
            />
          </View>
          <View style={styles.tiles}>
            <StatTile
              label="Unterkurse"
              value="3"
              unit=" von 8"
              tone="warning"
            />
            <StatTile label="Ziel" value="1,5" caption="noch 49 Punkte" />
          </View>
        </Section>

        <Section title="Halbjahr" variant="plain">
          <SegmentedControl
            options={HALF_YEARS.map((value) => ({ value, label: value }))}
            value={halfYear}
            onChange={setHalfYear}
            accessibilityLabel="Halbjahr"
          />
        </Section>

        <Section
          title="Aktuelles Halbjahr"
          footer="Lang drücken für Aktionen. Getönte Werte sind Prognosen aus deinen Noten."
          separatorInset={60}
          action={{ title: "Alle", onPress: noop }}
        >
          <ListRow
            title="Mathematik"
            subtitle="2 Klausuren, 3 sonstige Noten"
            leading={<SubjectAvatar catalogKey="ma" />}
            badges={
              <>
                <Chip
                  label="LK"
                  tone="accent"
                  accessibilityLabel="Leistungskurs"
                />
                <Chip label="P1" />
              </>
            }
            trailing={<PointsBadge points={11} exact={11.4} source="grades" />}
            chevron
            onPress={noop}
            menu={subjectMenu("Mathematik")}
          />
          <ListRow
            title="Deutsch"
            subtitle="Halbjahresergebnis"
            leading={<SubjectAvatar catalogKey="de" />}
            badges={
              <>
                <Chip
                  label="LK"
                  tone="accent"
                  accessibilityLabel="Leistungskurs"
                />
                <Chip label="P2" />
              </>
            }
            trailing={<PointsBadge points={13} source="official" />}
            chevron
            onPress={noop}
            menu={subjectMenu("Deutsch")}
          />
          <ListRow
            title="Englisch"
            subtitle="Noch keine Noten, geschätzt"
            leading={<SubjectAvatar catalogKey="en" />}
            badges={<Chip label="P3" />}
            trailing={<PointsBadge points={10} source="estimate" />}
            chevron
            onPress={noop}
            menu={subjectMenu("Englisch")}
          />
          <ListRow
            title="Geschichte"
            subtitle="Unterkurs"
            leading={<SubjectAvatar catalogKey="ge" />}
            trailing={<PointsBadge points={4} source="official" />}
            chevron
            onPress={noop}
            menu={subjectMenu("Geschichte")}
          />
          <ListRow
            title="Chemie"
            leading={<SubjectAvatar catalogKey="ch" />}
            trailing={<PointsBadge points={null} />}
            chevron
            onPress={noop}
          />
        </Section>

        <Section title="Verlauf" separatorInset={60}>
          <ListRow
            title="Physik"
            leading={<SubjectAvatar catalogKey="ph" />}
            trailing={
              <HalfYearStrip
                current={2}
                values={strip([
                  [12, null, "official"],
                  [13, null, "official"],
                  [12, 12.4, "grades"],
                  [12, null, "estimate"],
                ])}
              />
            }
          />
          <ListRow
            title="Sport"
            leading={<SubjectAvatar catalogKey="sp" />}
            trailing={
              <HalfYearStrip
                current={2}
                values={strip([
                  [15, null, "official"],
                  [14, null, "official"],
                  [null, null, "none"],
                  [null, null, "none"],
                ])}
              />
            }
          />
          <View style={styles.padded}>
            <HalfYearStrip
              current={2}
              showLabels
              values={strip([
                [7, null, "official"],
                [3, null, "official"],
                [6, 5.6, "grades"],
                [6, null, "estimate"],
              ])}
            />
          </View>
        </Section>

        <Section title="Punkteskala" variant="plain">
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.wrap}>
              {Array.from({ length: 16 }, (_, index) => 15 - index).map(
                (value) => (
                  <View key={value} style={styles.scaleCell}>
                    <PointsBadge
                      points={value}
                      source="official"
                      size="small"
                    />
                    <Text
                      style={[Type.caption2, { color: colors.textSecondary }]}
                    >
                      {gradeEquivalent(value)}
                    </Text>
                  </View>
                ),
              )}
            </View>
            <View style={styles.variants}>
              <Variant label="amtlich">
                <PointsBadge points={13} source="official" size="large" />
              </Variant>
              <Variant label="Prognose">
                <PointsBadge
                  points={11}
                  exact={11.4}
                  source="grades"
                  size="large"
                />
              </Variant>
              <Variant label="Schätzung">
                <PointsBadge points={8} source="estimate" size="large" />
              </Variant>
              <Variant label="leer">
                <PointsBadge points={null} size="large" />
              </Variant>
            </View>
          </View>
        </Section>

        <Section title="Note eintragen" variant="plain">
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <PointsPicker value={points} onChange={setPoints} />
          </View>
        </Section>

        <Section title="Zulassung">
          <CheckRow
            check={{
              label: "Mindestens 200 Punkte in Block I",
              passed: true,
              detail: "412 Punkte",
              predicted: false,
            }}
          />
          <CheckRow
            check={{
              label: "Höchstens 8 Kurse unter 5 Punkten",
              passed: true,
              detail: "3 von max. 8",
              predicted: true,
            }}
          />
          <CheckRow
            check={{
              label: "Mindestens 100 Punkte in Block II",
              passed: null,
              detail: "Noch 2 Prüfungen offen",
              predicted: false,
            }}
          />
          <CheckRow
            check={{
              label: "Keine Prüfung mit 0 Punkten",
              passed: false,
              detail: "P4 Biologie: 0 Punkte",
              predicted: false,
            }}
          />
        </Section>

        <Section title="Hinweise" variant="plain">
          <IssueBanner
            severity="error"
            title="Zu wenig Leistungskurse"
            message="Sachsen verlangt zwei Fächer auf erhöhtem Niveau. Du hast eins gewählt."
            onPress={noop}
          />
          <IssueBanner
            severity="warning"
            message="In Geschichte 12/2 fehlt noch ein Ergebnis. Die Berechnung nutzt eine Schätzung."
          />
          <IssueBanner
            severity="info"
            message="Die Regeln für den Jahrgang 2030 sind vorläufig."
          />
        </Section>

        <Section title="Kennzeichen" variant="plain">
          <View
            style={[
              styles.card,
              styles.chips,
              { backgroundColor: colors.card },
            ]}
          >
            <Chip label="LK" tone="accent" />
            <Chip label="eA" tone="accent" />
            <Chip label="P1" />
            <Chip label="×2" tone="outline" />
            <Chip label="Pflicht" />
            <Chip label="Prognose" tone="accent" size="medium" />
            <Chip label="Bestanden" tone="success" size="medium" />
            <Chip label="Unterkurs" tone="error" size="medium" />
            <Chip label="vorläufig" tone="warning" size="medium" />
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              Unterkurse 3 von 8
            </Text>
            <ProgressBar value={3} max={8} color={colors.warning} />
          </View>
          <View
            style={[
              styles.card,
              styles.avatars,
              { backgroundColor: colors.card },
            ]}
          >
            {SUBJECT_COLOR_KEYS.map((key, index) => (
              <SubjectAvatar
                key={key}
                color={key}
                catalogKey={
                  [
                    "de",
                    "ma",
                    "en",
                    "bio",
                    "ch",
                    "ph",
                    "inf",
                    "ge",
                    "geo",
                    "ku",
                    "mu",
                    "sp",
                  ][index]
                }
                size={36}
              />
            ))}
          </View>
        </Section>

        <Section title="Leerer Zustand" variant="plain">
          <View style={[styles.cardFlat, { backgroundColor: colors.card }]}>
            <EmptyState
              title="Noch keine Noten"
              message="Trag deine erste Note ein. AbiApp rechnet daraus deinen Schnitt."
              action={{
                title: "Erste Note eintragen",
                onPress: noop,
                icon: (
                  <Icon
                    icon={CirclePlus}
                    size={16}
                    color={colors.accentForeground}
                  />
                ),
              }}
            />
          </View>
        </Section>

        <Section title="Nicht bestanden" variant="plain">
          <GradeHero
            gradeTenths={null}
            totalPoints={287}
            predicted
            passed={false}
          />
        </Section>
      </ScreenLayout>
    </>
  );
}

const Variant = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.variant}>
      {children}
      <Text style={[Type.caption1, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 28,
    paddingBottom: 48,
  },
  tiles: {
    flexDirection: "row",
    gap: 12,
  },
  padded: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 16,
    gap: 16,
  },
  cardFlat: {
    borderRadius: 16,
    borderCurve: "continuous",
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scaleCell: {
    alignItems: "center",
    gap: 2,
    width: 34,
  },
  variants: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  variant: {
    alignItems: "center",
    gap: 6,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  avatars: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
