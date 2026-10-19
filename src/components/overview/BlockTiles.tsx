// Block I and Block II key figures side by side. Tap opens the Abitur tab.

import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { GraduationCap, Layers } from "lucide-react-native";

import { StatTile } from "@components/ui";
import type { AbiturEvaluation } from "@domain/model";
import { useTranslation } from "@locales/index";

import { pointsOrDash } from "./data";

export const BlockTiles = ({
  evaluation,
}: {
  evaluation: AbiturEvaluation;
}) => {
  const { t } = useTranslation();
  const { blockI, blockII } = evaluation;
  const openExams = blockII.components.filter(
    (component) => component.predicted || component.weighted === null,
  ).length;
  const openAbitur = () => router.navigate("/abitur");

  const deficits =
    blockI.deficits.maxTotal !== null
      ? t("home.blockI.deficits", {
          count: blockI.deficits.total,
          max: blockI.deficits.maxTotal,
        })
      : t("home.blockI.deficitsNoMax", { count: blockI.deficits.total });

  return (
    <View style={styles.row}>
      <StatTile
        label={t("home.blockI.label")}
        icon={{ sf: "square.stack.3d.up", fallback: Layers }}
        value={pointsOrDash(blockI.points)}
        unit={`/${blockI.maxPoints}`}
        tone={blockI.admitted === false ? "error" : "default"}
        progress={{
          value: blockI.points ?? 0,
          max: blockI.maxPoints,
          markers: [blockI.minPoints],
        }}
        caption={`${t("home.blockI.included", {
          count: blockI.countIncluded,
          total: blockI.countLabel,
        })}\n${deficits}`}
        onPress={openAbitur}
      />
      <StatTile
        label={t("home.blockII.label")}
        icon={{ sf: "graduationcap", fallback: GraduationCap }}
        value={pointsOrDash(blockII.points)}
        unit={`/${blockII.maxPoints}`}
        tone={blockII.passed === false ? "error" : "default"}
        progress={{
          value: blockII.points ?? 0,
          max: blockII.maxPoints,
          markers: [blockII.minPoints],
        }}
        caption={
          openExams > 0
            ? t("home.blockII.open", {
                count: openExams,
                total: blockII.components.length,
              })
            : t("home.blockII.allIn")
        }
        onPress={openAbitur}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
