// Block I and Block II key figures side by side. Tap opens the Abitur tab.

import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";

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
  const stacked = useWindowDimensions().fontScale >= 1.6;
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

  // Large text: tiles one below the other; side by side the labels break
  // mid-word ("eingebracht", "Unterkurse").
  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>
      <View style={stacked ? styles.stackedTile : styles.tile}>
        <StatTile
          label={t("home.blockI.label")}
          value={pointsOrDash(blockI.points)}
          unit={`/${blockI.maxPoints}`}
          tone={blockI.admitted === false ? "error" : "default"}
          progress={{
            value: blockI.points ?? 0,
            max: blockI.maxPoints,
            markers: [blockI.minPoints],
          }}
          caption={[
            t("home.blockI.included", {
              count: blockI.countIncluded,
              total: blockI.countLabel,
            }),
            deficits,
          ]}
          onPress={openAbitur}
        />
      </View>
      <View style={stacked ? styles.stackedTile : styles.tile}>
        <StatTile
          label={t("home.blockII.label")}
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
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  rowStacked: {
    flexDirection: "column",
  },
  tile: {
    flex: 1,
    flexDirection: "row",
  },
  // Row direction so the tile's flex: 1 fills the width, not the height.
  stackedTile: {
    flexDirection: "row",
  },
});
